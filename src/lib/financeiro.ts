import "server-only";
import { and, asc, desc, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "./db/client";
import { lancamentos, orders, socios } from "./db/schema";
import { isoDay } from "./format";
import {
  acertos,
  limiteMeiCents,
  resumir,
  type Acerto,
  type Movimento,
  type Resumo,
  type SocioBase,
  type StatusLancamento,
  type TipoLancamento,
} from "./financeiro-calc";

// Leitura do livro caixa no banco. As contas em si moram em
// financeiro-calc.ts, testadas; aqui só se junta o que elas precisam.

export const CATEGORIAS = [
  "Estoque (peças)",
  "Equipamento",
  "Embalagem",
  "Frete e etiquetas",
  "Marketing e anúncios",
  "Taxas (Mercado Pago, banco)",
  "Impostos (DAS do MEI)",
  "Sistemas e domínio",
  "Serviços (fotos, design)",
  "Outros",
] as const;

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

export async function listarSocios() {
  return db.select().from(socios).orderBy(asc(socios.createdAt));
}

async function vendasRecebidasCents(desde?: Date, ate?: Date): Promise<number> {
  const filtros = [inArray(orders.status, [...PEDIDO_RECEBIDO])];
  if (desde) filtros.push(gte(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, sql`${desde.toISOString()}::timestamptz`) as never);
  if (ate) filtros.push(lt(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, sql`${ate.toISOString()}::timestamptz`) as never);
  const [r] = await db
    .select({ n: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int` })
    .from(orders)
    .where(and(...filtros));
  return r?.n ?? 0;
}

async function movimentos(): Promise<Movimento[]> {
  const rows = await db.query.lancamentos.findMany({ with: { pagadores: true } });
  return rows.map((l) => ({
    tipo: l.tipo as TipoLancamento,
    status: l.status as StatusLancamento,
    valorCents: l.valorCents,
    socioId: l.socioId,
    pagadores: l.pagadores.map((p) => ({ socioId: p.socioId, valorCents: p.valorCents })),
  }));
}

export type PainelFinanceiro = {
  resumo: Resumo;
  acertos: Acerto[];
  mei: { ano: number; faturadoCents: number; limiteCents: number };
};

export async function painelFinanceiro(): Promise<PainelFinanceiro> {
  const [lista, movs, vendas] = await Promise.all([listarSocios(), movimentos(), vendasRecebidasCents()]);
  const base: SocioBase[] = lista.map((s) => ({ id: s.id, nome: s.nome, cotas: s.cotas, ativo: s.ativo }));
  const resumo = resumir(base, movs, vendas);

  // Faturamento do ano no fuso de Brasília, que é o que conta para o MEI:
  // vendas do site mais receitas lançadas à mão (venda em feira, por
  // exemplo). O teto é por ano-calendário.
  const ano = Number(isoDay(new Date()).slice(0, 4));
  const inicioAno = new Date(`${ano}-01-01T00:00:00-03:00`);
  const inicioProximo = new Date(`${ano + 1}-01-01T00:00:00-03:00`);
  const [vendasAno, [receitasAno]] = await Promise.all([
    vendasRecebidasCents(inicioAno, inicioProximo),
    db
      .select({ n: sql<number>`coalesce(sum(${lancamentos.valorCents}), 0)::int` })
      .from(lancamentos)
      .where(
        and(
          sql`${lancamentos.tipo} = 'receita'`,
          sql`${lancamentos.status} = 'pago'`,
          gte(lancamentos.data, `${ano}-01-01`),
          lt(lancamentos.data, `${ano + 1}-01-01`),
        ),
      ),
  ]);

  return {
    resumo,
    acertos: acertos(resumo.socios.filter((l) => lista.find((s) => s.id === l.id)?.ativo)),
    mei: { ano, faturadoCents: vendasAno + (receitasAno?.n ?? 0), limiteCents: limiteMeiCents(ano) },
  };
}

export async function listarLancamentos(filtro: { mes?: string; tipo?: string; socioId?: string }) {
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
