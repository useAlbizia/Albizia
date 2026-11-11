import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "./db/client";
import { lancamentoPagadores, lancamentos, metasMensais, orderItems, orders, products, socios } from "./db/schema";
import { isoDay } from "./format";
import { sincronizarPendentes } from "./mp-sync";
import { after } from "next/server";
import { getPaymentSettings } from "./payments";
import { reavaliarPendentes } from "./aprovacao";
import {
  acertos,
  CATEGORIAS_DESPESA,
  calcularDre,
  type Dre,
  limiteMeiCents,
  resumir,
  type Acerto,
  type Automaticos,
  type Movimento,
  type Resumo,
  type SocioBase,
  type StatusLancamento,
  type TipoLancamento,
} from "./financeiro-calc";

// Leitura do livro caixa no banco. As contas em si moram em
// financeiro-calc.ts, testadas; aqui só se junta o que elas precisam.

// Uma lista só, a do cálculo (financeiro-calc.ts), onde cada categoria tem o
// seu lugar no resultado do mês. Duas listas acabariam com um nome diferente
// e um gasto contado no lugar errado.
export const CATEGORIAS: readonly string[] = CATEGORIAS_DESPESA.map((c) => c.nome);

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Transferência",
] as const;

// Pedido conta como venda recebida quando foi pago ou já enviado. Reembolso e
// cancelamento não contam: esse dinheiro voltou para o cliente.
const PEDIDO_RECEBIDO = ["paid", "shipped"] as const;
// Etiqueta que de fato custou dinheiro. "cart" ainda não foi comprada e
// "canceled" voltou para a carteira do Melhor Envio.
const ETIQUETA_PAGA = ["paid", "generated", "posted", "delivered"] as const;

export async function listarSocios() {
  return db.select().from(socios).orderBy(asc(socios.createdAt));
}

// Data em que a venda conta: a do pagamento, ou a do pedido se faltar.
const dataVenda = sql`coalesce(${orders.paidAt}, ${orders.createdAt})`;

function vendaValida() {
  // Estorno total e contestação perdida desfazem a venda, mesmo que o pedido
  // continue "pago" no painel.
  return and(
    inArray(orders.status, [...PEDIDO_RECEBIDO]),
    sql`coalesce(${orders.mpStatus}, '') not in ('refunded', 'charged_back')`,
  );
}

function noPeriodo(coluna: ReturnType<typeof sql>, desde?: Date, ate?: Date) {
  const f = [];
  if (desde) f.push(sql`${coluna} >= ${desde.toISOString()}::timestamptz`);
  if (ate) f.push(sql`${coluna} < ${ate.toISOString()}::timestamptz`);
  return f;
}

/** O que as integrações colocam e tiram do caixa sozinhas, num período. */
async function automaticos(desde?: Date, ate?: Date): Promise<Automaticos> {
  const [[v], [e]] = await Promise.all([
    db
      .select({
        vendas: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        taxas: sql<number>`coalesce(sum(${orders.mpFeeCents}), 0)::int`,
        estornos: sql<number>`coalesce(sum(${orders.mpRefundedCents}), 0)::int`,
        aLiberar: sql<number>`coalesce(sum(case when ${orders.mpReleaseDate} > now() then ${orders.mpNetCents} else 0 end), 0)::int`,
      })
      .from(orders)
      .where(and(vendaValida(), ...noPeriodo(dataVenda, desde, ate))),
    db
      .select({ etiquetas: sql<number>`coalesce(sum(${orders.meLabelCostCents}), 0)::int` })
      .from(orders)
      .where(
        and(
          inArray(orders.meStatus, [...ETIQUETA_PAGA]),
          ...noPeriodo(sql`coalesce(${orders.meLabeledAt}, ${orders.updatedAt})`, desde, ate),
        ),
      ),
  ]);
  return {
    vendasCents: v?.vendas ?? 0,
    taxasMpCents: v?.taxas ?? 0,
    estornosCents: v?.estornos ?? 0,
    etiquetasCents: e?.etiquetas ?? 0,
    aLiberarCents: v?.aLiberar ?? 0,
  };
}

export type LinhaAutomatica = {
  id: string;
  data: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valorCents: number;
  fonte: "Mercado Pago" | "Melhor Envio";
  pedidoId: string;
  detalhe: string;
};

/**
 * As vendas, taxas, estornos e etiquetas como linhas do extrato.
 *
 * Só leitura: elas não estão na tabela de lançamentos e não dá para editar
 * nem excluir, porque a verdade delas está no Mercado Pago e no Melhor
 * Envio. Para corrigir, corrige-se lá (ou o pedido no painel).
 */
export async function listarAutomaticos(filtro: { mes?: string; tipo?: string }): Promise<LinhaAutomatica[]> {
  if (filtro.tipo && filtro.tipo !== "receita" && filtro.tipo !== "despesa") return [];
  let desde: Date | undefined;
  let ate: Date | undefined;
  if (filtro.mes && /^\d{4}-\d{2}$/.test(filtro.mes)) {
    const [a, m] = filtro.mes.split("-").map(Number);
    desde = new Date(`${filtro.mes}-01T00:00:00-03:00`);
    ate = new Date(`${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00-03:00`);
  }

  const [vendas, etiquetas] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(and(vendaValida(), ...noPeriodo(dataVenda, desde, ate)))
      .orderBy(desc(dataVenda))
      .limit(300),
    db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.meStatus, [...ETIQUETA_PAGA]),
          isNotNull(orders.meLabelCostCents),
          ...noPeriodo(sql`coalesce(${orders.meLabeledAt}, ${orders.updatedAt})`, desde, ate),
        ),
      )
      .limit(300),
  ]);

  const linhas: LinhaAutomatica[] = [];
  for (const o of vendas) {
    const data = isoDay(o.paidAt ?? o.createdAt);
    const liberacao = o.mpReleaseDate
      ? o.mpReleaseDate > new Date()
        ? `libera em ${isoDay(o.mpReleaseDate).split("-").reverse().join("/")}`
        : "liberado"
      : o.mpSyncedAt
        ? ""
        : "aguardando dados do Mercado Pago";
    if (filtro.tipo !== "despesa") {
      linhas.push({
        id: `venda-${o.id}`,
        data,
        tipo: "receita",
        descricao: `Venda #${o.orderNumber}`,
        valorCents: o.totalCents,
        fonte: "Mercado Pago",
        pedidoId: o.id,
        detalhe: [o.paymentMethod, liberacao].filter(Boolean).join(" · "),
      });
    }
    if (filtro.tipo !== "receita") {
      if (o.mpFeeCents) {
        linhas.push({
          id: `taxa-${o.id}`,
          data,
          tipo: "despesa",
          descricao: `Taxa do Mercado Pago, venda #${o.orderNumber}`,
          valorCents: o.mpFeeCents,
          fonte: "Mercado Pago",
          pedidoId: o.id,
          detalhe: "",
        });
      }
      if (o.mpRefundedCents > 0) {
        linhas.push({
          id: `estorno-${o.id}`,
          data,
          tipo: "despesa",
          descricao: `Estorno parcial, venda #${o.orderNumber}`,
          valorCents: o.mpRefundedCents,
          fonte: "Mercado Pago",
          pedidoId: o.id,
          detalhe: "",
        });
      }
    }
  }
  if (filtro.tipo !== "receita") {
    for (const o of etiquetas) {
      linhas.push({
        id: `etiqueta-${o.id}`,
        data: isoDay(o.meLabeledAt ?? o.updatedAt),
        tipo: "despesa",
        descricao: `Etiqueta, pedido #${o.orderNumber}`,
        valorCents: o.meLabelCostCents ?? 0,
        fonte: "Melhor Envio",
        pedidoId: o.id,
        detalhe: [o.meCompany, o.meServiceName].filter(Boolean).join(" "),
      });
    }
  }
  return linhas;
}

/** Lançamentos como movimentos; com `antesDe`, só os anteriores a essa data. */
async function movimentos(antesDe?: string): Promise<Movimento[]> {
  // Só o que os sócios aprovaram entra nas contas: lançamento aguardando
  // aprovação ou contestado não mexe em caixa nem no capital de ninguém.
  const aprovado = eq(lancamentos.aprovacao, "aprovado");
  const rows = await db.query.lancamentos.findMany({
    where: antesDe ? and(aprovado, lt(lancamentos.data, antesDe)) : aprovado,
    with: { pagadores: true },
  });
  return rows.flatMap((l): Movimento[] => {
    // Despesa conta parte por parte: o que cada um já pagou (botão Pagar)
    // entra como pago; o que falta pagar fica como previsto. Uma parcela
    // dividida em que só um pagou vira duas metades, uma de cada lado.
    if (l.tipo === "despesa" && l.pagadores.length > 0) {
      const pagas = l.pagadores.filter((p) => p.pagoEm);
      const faltam = l.pagadores.filter((p) => !p.pagoEm);
      const mov = (ps: typeof l.pagadores, status: StatusLancamento): Movimento => ({
        tipo: "despesa",
        status,
        valorCents: ps.reduce((n, p) => n + p.valorCents, 0),
        socioId: null,
        pagadores: ps.map((p) => ({ socioId: p.socioId, valorCents: p.valorCents })),
      });
      return [...(pagas.length ? [mov(pagas, "pago")] : []), ...(faltam.length ? [mov(faltam, "previsto")] : [])];
    }
    return [
      {
        tipo: l.tipo as TipoLancamento,
        status: l.status as StatusLancamento,
        valorCents: l.valorCents,
        socioId: l.socioId,
        pagadores: l.pagadores.map((p) => ({ socioId: p.socioId, valorCents: p.valorCents })),
      },
    ];
  });
}

/**
 * O status do lançamento acompanha as partes: "pago" quando todas as partes
 * foram pagas, "previsto" enquanto falta alguma. Chamado a cada Pagar.
 */
export async function atualizarStatusPeloPagamento(lancamentoId: string): Promise<void> {
  const partes = await db.select().from(lancamentoPagadores).where(eq(lancamentoPagadores.lancamentoId, lancamentoId));
  if (partes.length === 0) return;
  const status = partes.every((p) => p.pagoEm) ? "pago" : "previsto";
  await db.update(lancamentos).set({ status, updatedAt: new Date() }).where(eq(lancamentos.id, lancamentoId));
}

export type ParteAPagar = {
  pagadorId: string;
  lancamentoId: string;
  descricao: string;
  parcela: string;
  vencimento: string;
  valorCents: number;
  socioId: string | null;
  aprovacao: string;
};

/** As partes ainda não pagas, da mais antiga para a mais nova: o calendário de contas. */
export async function contasAPagar(): Promise<ParteAPagar[]> {
  const rows = await db
    .select({
      pagadorId: lancamentoPagadores.id,
      lancamentoId: lancamentos.id,
      descricao: lancamentos.descricao,
      parcelaNum: lancamentos.parcelaNum,
      parcelaTotal: lancamentos.parcelaTotal,
      vencimento: lancamentos.data,
      valorCents: lancamentoPagadores.valorCents,
      socioId: lancamentoPagadores.socioId,
      aprovacao: lancamentos.aprovacao,
    })
    .from(lancamentoPagadores)
    .innerJoin(lancamentos, eq(lancamentos.id, lancamentoPagadores.lancamentoId))
    .where(and(isNull(lancamentoPagadores.pagoEm), sql`${lancamentos.aprovacao} <> 'contestado'`))
    .orderBy(asc(lancamentos.data));
  return rows.map((r) => ({
    ...r,
    parcela: r.parcelaTotal ? `${r.parcelaNum}/${r.parcelaTotal}` : "",
  }));
}

export type PainelFinanceiro = {
  resumo: Resumo;
  acertos: Acerto[];
  mei: { ano: number; faturadoCents: number; limiteCents: number };
  /** Situação da leitura do Mercado Pago, para a tela avisar quando falta dado. */
  sync: { semToken: boolean; erros: number; pendentes: number };
};

/**
 * Quanto de cada sócio está lançado mas ainda espera aprovação (só o que já
 * venceu). Não entra em nenhuma conta: serve para o equalizador mostrar, em
 * tom claro, o que vai entrar, em vez de uma tela zerada.
 */
export async function pendentePorSocio(): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  try {
    const rows = await db.query.lancamentos.findMany({
      where: and(eq(lancamentos.aprovacao, "pendente"), eq(lancamentos.status, "pago")),
      with: { pagadores: true },
    });
    const soma = (id: string | null, v: number) => {
      if (id) mapa.set(id, (mapa.get(id) ?? 0) + v);
    };
    for (const l of rows) {
      if (l.tipo === "despesa") for (const p of l.pagadores) soma(p.socioId, p.valorCents);
      else if (l.tipo === "aporte") soma(l.socioId, l.valorCents);
    }
  } catch (err) {
    console.error("pendentePorSocio falhou", err);
  }
  return mapa;
}

export async function painelFinanceiro(): Promise<PainelFinanceiro> {
  await reavaliarPendentes();
  // Antes de somar, traz do Mercado Pago o que ainda falta (pedido pago que o
  // webhook perdeu, estorno recente). Poucos por vez, para a tela não
  // demorar; falha aqui nunca impede a tela de abrir.
  // A conferência com o Mercado Pago roda DEPOIS de a tela abrir (after):
  // ela consulta a API do Mercado Pago pedido por pedido e não pode segurar
  // a tela. O que ela atualizar aparece na próxima vez que a tela abrir.
  try {
    after(() => sincronizarPendentes(15).catch(() => null));
  } catch {
    // Fora de uma requisição (scripts, testes): só pula.
  }
  const { accessToken } = await getPaymentSettings().catch(() => ({ accessToken: "" }));
  const sync = { semToken: !accessToken, erros: 0 };

  const [lista, movs, auto] = await Promise.all([listarSocios(), movimentos(), automaticos()]);
  const base: SocioBase[] = lista.map((s) => ({ id: s.id, nome: s.nome, cotas: s.cotas, ativo: s.ativo }));
  const resumo = resumir(base, movs, auto);
  const [pendentesSync] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(vendaValida(), isNotNull(orders.mpPaymentId), isNull(orders.mpSyncedAt)));

  // Faturamento do ano no fuso de Brasília, que é o que conta para o MEI:
  // vendas do site mais receitas lançadas à mão (venda em feira, por
  // exemplo). O teto é por ano-calendário.
  const ano = Number(isoDay(new Date()).slice(0, 4));
  const inicioAno = new Date(`${ano}-01-01T00:00:00-03:00`);
  const inicioProximo = new Date(`${ano + 1}-01-01T00:00:00-03:00`);
  const [autoAno, [receitasAno]] = await Promise.all([
    automaticos(inicioAno, inicioProximo),
    db
      .select({ n: sql<number>`coalesce(sum(${lancamentos.valorCents}), 0)::int` })
      .from(lancamentos)
      .where(
        and(
          sql`${lancamentos.tipo} = 'receita'`,
          sql`${lancamentos.status} = 'pago'`,
          eq(lancamentos.aprovacao, "aprovado"),
          gte(lancamentos.data, `${ano}-01-01`),
          lt(lancamentos.data, `${ano + 1}-01-01`),
        ),
      ),
  ]);

  return {
    resumo,
    acertos: acertos(resumo.socios.filter((l) => lista.find((s) => s.id === l.id)?.ativo)),
    // Para o MEI conta o que foi faturado, então o estorno parcial sai.
    mei: {
      ano,
      faturadoCents: autoAno.vendasCents - autoAno.estornosCents + (receitasAno?.n ?? 0),
      limiteCents: limiteMeiCents(ano),
    },
    sync: {
      semToken: !!sync?.semToken,
      erros: sync?.erros ?? 0,
      pendentes: pendentesSync?.n ?? 0,
    },
  };
}

export async function listarLancamentos(filtro: { mes?: string; tipo?: string; socioId?: string }) {
  await reavaliarPendentes();
  const conds = [];
  if (filtro.mes && /^\d{4}-\d{2}$/.test(filtro.mes)) {
    const [a, m] = filtro.mes.split("-").map(Number);
    const fim = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
    conds.push(gte(lancamentos.data, `${filtro.mes}-01`), lt(lancamentos.data, fim));
  }
  if (filtro.tipo) conds.push(sql`${lancamentos.tipo} = ${filtro.tipo}`);

  const rows = await db.query.lancamentos.findMany({
    where: conds.length ? and(...conds) : undefined,
    with: { pagadores: true, socio: true },
    orderBy: [desc(lancamentos.data), desc(lancamentos.createdAt)],
    limit: 300,
  });

  // Filtro por sócio olha também os pagadores: a parcela da prensa paga
  // pelos três aparece no extrato de cada um.
  if (!filtro.socioId) return rows;
  return rows.filter(
    (r) => r.socioId === filtro.socioId || r.pagadores.some((p) => p.socioId === filtro.socioId),
  );
}

// ── Fechamento do mês ────────────────────────────────────────────────────

export type Fechamento = {
  mes: string;
  dre: Dre;
  caixa: { inicialCents: number; entradasCents: number; saidasCents: number; finalCents: number };
  /** Cada modelo vendido no mês: o que entrou, o que custou e o que sobrou. */
  porModelo: { id: string; nome: string; qtd: number; receitaCents: number; custoCents: number | null; sobraCents: number | null }[];
  /** Produtos com venda no mês e sem custo informado, para corrigir. */
  produtosSemCusto: { id: string; nome: string }[];
};

/** Limites do mês no fuso de Brasília: "2026-12" vira 01/12 00:00 até 01/01 00:00. */
function limitesDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const proximo = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
  return {
    inicioData: `${mes}-01`,
    fimData: `${proximo}-01`,
    inicio: new Date(`${mes}-01T00:00:00-03:00`),
    fim: new Date(`${proximo}-01T00:00:00-03:00`),
  };
}

export async function fechamentoDoMes(mes: string): Promise<Fechamento> {
  const { inicioData, fimData, inicio, fim } = limitesDoMes(mes);

  const [auto, receitasMes, despesasMes, itens, meta, base, movsAntes, movsAte, autoAntes, autoAte, embalagens] =
    await Promise.all([
      automaticos(inicio, fim),
      db
        .select({ n: sql<number>`coalesce(sum(${lancamentos.valorCents}), 0)::int` })
        .from(lancamentos)
        .where(
          and(
            sql`${lancamentos.tipo} = 'receita'`,
            sql`${lancamentos.status} = 'pago'`,
          eq(lancamentos.aprovacao, "aprovado"),
            gte(lancamentos.data, inicioData),
            lt(lancamentos.data, fimData),
          ),
        ),
      // Gasto do mês por categoria, não importa quem pagou: para o resultado
      // interessa o que a EMPRESA gastou. Quem pagou é assunto do capital.
      db
        .select({
          categoria: lancamentos.categoria,
          n: sql<number>`coalesce(sum(${lancamentos.valorCents}), 0)::int`,
        })
        .from(lancamentos)
        .where(
          and(
            sql`${lancamentos.tipo} = 'despesa'`,
            sql`${lancamentos.status} = 'pago'`,
          eq(lancamentos.aprovacao, "aprovado"),
            gte(lancamentos.data, inicioData),
            lt(lancamentos.data, fimData),
          ),
        )
        .groupBy(lancamentos.categoria),
      // Peças vendidas no mês, com o custo do dia da venda (ou o atual, se a
      // venda é anterior ao campo de custo).
      db
        .select({
          produtoId: orderItems.productId,
          produto: products.name,
          qtd: orderItems.quantity,
          preco: orderItems.unitPriceCents,
          custoVenda: orderItems.unitCostCents,
          custoAtual: products.custoCents,
        })
        .from(orderItems)
        .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
        .leftJoin(products, sql`${products.id} = ${orderItems.productId}`)
        .where(and(vendaValida(), ...noPeriodo(dataVenda, inicio, fim))),
      db.query.metasMensais.findFirst({ where: sql`${metasMensais.mes} = ${mes}` }),
      listarSocios(),
      movimentos(inicioData),
      movimentos(fimData),
      automaticos(undefined, inicio),
      automaticos(undefined, fim),
      // Um envelope por pedido vendido no mês, pelo custo do dia da venda.
      db
        .select({ n: sql<number>`coalesce(sum(${orders.embalagemCents}), 0)::int` })
        .from(orders)
        .where(and(vendaValida(), ...noPeriodo(dataVenda, inicio, fim))),
    ]);

  let cmv = 0;
  let semCusto = 0;
  const produtosSemCusto = new Map<string, string>();
  const modelos = new Map<string, { nome: string; qtd: number; receita: number; custo: number; semCusto: boolean }>();
  for (const it of itens) {
    const custo = it.custoVenda ?? (it.custoAtual && it.custoAtual > 0 ? it.custoAtual : null);
    if (custo === null) {
      semCusto += it.qtd;
      if (it.produtoId) produtosSemCusto.set(it.produtoId, it.produto ?? "Produto removido");
    } else {
      cmv += custo * it.qtd;
    }
    const chave = it.produtoId ?? `removido-${it.produto}`;
    const m = modelos.get(chave) ?? { nome: it.produto ?? "Produto removido", qtd: 0, receita: 0, custo: 0, semCusto: false };
    m.qtd += it.qtd;
    m.receita += it.preco * it.qtd;
    if (custo === null) m.semCusto = true;
    else m.custo += custo * it.qtd;
    modelos.set(chave, m);
  }
  // Por modelo, a "sobra" é preço menos custo da peça. Taxa e frete não
  // entram aqui porque são do pedido, não da peça; eles aparecem no resultado
  // do mês. Se faltar custo de alguma unidade, o modelo mostra "sem custo" em
  // vez de uma sobra inventada.
  const porModelo = [...modelos]
    .map(([id, m]) => ({
      id,
      nome: m.nome,
      qtd: m.qtd,
      receitaCents: m.receita,
      custoCents: m.semCusto ? null : m.custo,
      sobraCents: m.semCusto ? null : m.receita - m.custo,
    }))
    .sort((a, b) => b.receitaCents - a.receitaCents);

  const despesasPorCategoria: Record<string, number> = {};
  for (const d of despesasMes) despesasPorCategoria[d.categoria || "Outros"] = d.n;

  const dre = calcularDre({
    vendasCents: auto.vendasCents,
    receitasAvulsasCents: receitasMes[0]?.n ?? 0,
    estornosCents: auto.estornosCents,
    cmvCents: cmv,
    itensSemCusto: semCusto,
    taxasMpCents: auto.taxasMpCents,
    etiquetasCents: auto.etiquetasCents,
    embalagensPedidoCents: embalagens[0]?.n ?? 0,
    despesasPorCategoria,
    metaCents: meta?.vendasCents ?? null,
  });

  // Caixa: o mesmo cálculo do painel, feito até o início e até o fim do mês.
  // A diferença entre os dois É o mês, sem uma segunda conta que possa
  // discordar da primeira.
  const socBase: SocioBase[] = base.map((s) => ({ id: s.id, nome: s.nome, cotas: s.cotas, ativo: s.ativo }));
  const antes = resumir(socBase, movsAntes, autoAntes).caixa;
  const depois = resumir(socBase, movsAte, autoAte).caixa;

  return {
    mes,
    dre,
    caixa: {
      inicialCents: antes.saldoCents,
      entradasCents: depois.entradasCents - antes.entradasCents,
      saidasCents: depois.saidasCents - antes.saidasCents,
      finalCents: depois.saldoCents,
    },
    porModelo,
    produtosSemCusto: [...produtosSemCusto].map(([id, nome]) => ({ id, nome })),
  };
}

/** Vendas e resultado dos últimos meses, do mais antigo ao atual, para os gráficos. */
export async function serieMensal(meses = 6): Promise<{ mes: string; vendasCents: number; resultadoCents: number }[]> {
  const atual = isoDay(new Date()).slice(0, 7);
  const [a, m] = atual.split("-").map(Number);
  const lista = Array.from({ length: meses }, (_, i) => {
    const t = a * 12 + (m - 1) - (meses - 1 - i);
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  });
  // Um mês de cada vez: os seis ao mesmo tempo disparavam umas 66 consultas
  // juntas e ajudavam a lotar as conexões do banco.
  const fechamentos = [];
  for (const mes of lista) fechamentos.push(await fechamentoDoMes(mes));
  return fechamentos.map((f) => ({ mes: f.mes, vendasCents: f.dre.receitaBrutaCents, resultadoCents: f.dre.resultadoCents }));
}
