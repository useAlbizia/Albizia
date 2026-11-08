// Contas do livro caixa e do capital dos sócios.
//
// Funções puras, sem banco, para poderem ser testadas linha por linha
// (scripts/test-financeiro.ts). Dinheiro sempre em centavos inteiros: com
// número quebrado, 3 x 33,33 vira 99,99 e o centavo some.
//
// O MODELO, em português simples:
//
// - Caixa é o dinheiro da EMPRESA (conta do Mercado Pago e banco). Entra com
//   venda, receita avulsa e aporte de sócio; sai com despesa paga pela
//   empresa, devolução de aporte e distribuição de lucro.
// - Capital de um sócio é o que ele tirou do próprio bolso para a empresa:
//   aporte em dinheiro mais as despesas da empresa que ele pagou com o
//   dinheiro dele. Devolução de aporte diminui o capital.
// - Parte justa é o capital total dividido pelas cotas. Com três sócios
//   iguais, um terço para cada.
// - Diferença é capital menos parte justa: positivo = colocou a mais e tem a
//   receber; negativo = colocou a menos.
//
// Só lançamento "pago" mexe em saldo. Parcela "prevista" aparece à parte:
// é compromisso, ainda não é dinheiro que saiu.

export type TipoLancamento =
  | "despesa"
  | "receita"
  | "aporte"
  | "devolucao_aporte"
  | "distribuicao_lucro";

export type StatusLancamento = "pago" | "previsto";

export type SocioBase = { id: string; nome: string; cotas: number; ativo: boolean };

export type Movimento = {
  tipo: TipoLancamento;
  status: StatusLancamento;
  valorCents: number;
  /** Aporte, devolução e distribuição: de qual sócio. */
  socioId: string | null;
  /** Despesa: quem pagou quanto. socioId null = empresa (caixa). */
  pagadores: { socioId: string | null; valorCents: number }[];
};

/** Divide um valor em n partes inteiras que somam exatamente o total. */
export function dividirIgual(totalCents: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const sobra = totalCents - base * n;
  // O centavo que sobra vai para as primeiras partes, um em cada.
  return Array.from({ length: n }, (_, i) => base + (i < sobra ? 1 : 0));
}

/** Divide proporcionalmente a pesos (cotas), somando exatamente o total. */
export function dividirPorPeso(totalCents: number, pesos: number[]): number[] {
  const soma = pesos.reduce((a, b) => a + b, 0);
  if (soma <= 0) return pesos.map(() => 0);
  const brutos = pesos.map((p) => (totalCents * p) / soma);
  const partes = brutos.map(Math.floor);
  let sobra = totalCents - partes.reduce((a, b) => a + b, 0);
  // Maior resto primeiro: é a regra que distribui o centavo com menos
  // distorção.
  const ordem = brutos
    .map((b, i) => ({ i, resto: b - Math.floor(b) }))
    .sort((a, b) => b.resto - a.resto);
  for (const { i } of ordem) {
    if (sobra <= 0) break;
    partes[i] += 1;
    sobra -= 1;
  }
  return partes;
}

/** "2026-01-31" + 1 mês = "2026-02-28": o dia vira o último do mês se não existir. */
export function somarMeses(dataISO: string, meses: number): string {
  const [a, m, d] = dataISO.split("-").map(Number);
  const totalMeses = a * 12 + (m - 1) + meses;
  const ano = Math.floor(totalMeses / 12);
  const mes = (totalMeses % 12) + 1;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDia);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export type Parcela = { num: number; total: number; data: string; valorCents: number; status: StatusLancamento };

/**
 * As parcelas de uma compra parcelada.
 *
 * Parcela com data até hoje nasce "pago", porque o normal é lançar compras
 * antigas de uma vez (vocês vão lançar tudo desde o começo). As futuras
 * nascem "previsto" e são marcadas quando a fatura for paga.
 */
export function gerarParcelas(totalCents: number, n: number, primeiraData: string, hojeISO: string): Parcela[] {
  const valores = dividirIgual(totalCents, Math.max(1, n));
  return valores.map((valorCents, i) => {
    const data = somarMeses(primeiraData, i);
    return { num: i + 1, total: valores.length, data, valorCents, status: data <= hojeISO ? "pago" : "previsto" };
  });
}

export type LinhaSocio = {
  id: string;
  nome: string;
  cotas: number;
  /** Aportes em dinheiro + despesas da empresa pagas do próprio bolso. */
  investidoCents: number;
  devolvidoCents: number;
  capitalCents: number;
  parteJustaCents: number;
  /** Positivo: colocou a mais e tem a receber. Negativo: colocou a menos. */
  diferencaCents: number;
  lucroRecebidoCents: number;
  /** Parcelas futuras que cabem a este sócio. */
  previstoCents: number;
};

/**
 * O que entra no caixa sozinho, pelas integrações, sem ninguém lançar.
 *
 * Vendas, taxa e estorno vêm do Mercado Pago; etiquetas, do Melhor Envio.
 * Ficam fora da tabela de lançamentos de propósito: se fossem copiados para
 * lá, qualquer correção no Mercado Pago (um estorno uma semana depois)
 * deixaria as duas cópias discordando.
 */
export type Automaticos = {
  vendasCents: number;
  taxasMpCents: number;
  estornosCents: number;
  etiquetasCents: number;
  /** Já é da empresa, mas o Mercado Pago ainda não liberou para saque. */
  aLiberarCents: number;
};

export const SEM_AUTOMATICOS: Automaticos = {
  vendasCents: 0,
  taxasMpCents: 0,
  estornosCents: 0,
  etiquetasCents: 0,
  aLiberarCents: 0,
};

export type Resumo = {
  caixa: {
    vendasCents: number;
    receitasCents: number;
    aportesCents: number;
    entradasCents: number;
    taxasMpCents: number;
    estornosCents: number;
    etiquetasCents: number;
    despesasEmpresaCents: number;
    devolucoesCents: number;
    distribuicoesCents: number;
    saidasCents: number;
    saldoCents: number;
    /** Parte do saldo que ainda está presa no Mercado Pago. */
    aLiberarCents: number;
  };
  capitalTotalCents: number;
  /** Tudo que a empresa gastou, não importa quem pagou. */
  despesasTotalCents: number;
  socios: LinhaSocio[];
  previsto: { totalCents: number; empresaCents: number };
};

export function resumir(socios: SocioBase[], movimentos: Movimento[], auto: Automaticos = SEM_AUTOMATICOS): Resumo {
  const linhas = new Map<string, LinhaSocio>();
  for (const s of socios) {
    linhas.set(s.id, {
      id: s.id,
      nome: s.nome,
      cotas: s.cotas,
      investidoCents: 0,
      devolvidoCents: 0,
      capitalCents: 0,
      parteJustaCents: 0,
      diferencaCents: 0,
      lucroRecebidoCents: 0,
      previstoCents: 0,
    });
  }

  let receitas = 0;
  let aportes = 0;
  let despesasEmpresa = 0;
  let devolucoes = 0;
  let distribuicoes = 0;
  let despesasTotal = 0;
  let previstoTotal = 0;
  let previstoEmpresa = 0;

  for (const mv of movimentos) {
    if (mv.status === "previsto") {
      if (mv.tipo !== "despesa") continue;
      previstoTotal += mv.valorCents;
      for (const p of mv.pagadores) {
        if (p.socioId === null) previstoEmpresa += p.valorCents;
        else {
          const l = linhas.get(p.socioId);
          if (l) l.previstoCents += p.valorCents;
        }
      }
      continue;
    }

    switch (mv.tipo) {
      case "despesa": {
        despesasTotal += mv.valorCents;
        for (const p of mv.pagadores) {
          if (p.socioId === null) {
            despesasEmpresa += p.valorCents;
          } else {
            // Sócio pagando conta da empresa com o próprio dinheiro: é
            // capital que ele colocou, mesmo sem ter passado pelo caixa.
            const l = linhas.get(p.socioId);
            if (l) l.investidoCents += p.valorCents;
          }
        }
        break;
      }
      case "receita":
        receitas += mv.valorCents;
        break;
      case "aporte": {
        aportes += mv.valorCents;
        const l = mv.socioId ? linhas.get(mv.socioId) : undefined;
        if (l) l.investidoCents += mv.valorCents;
        break;
      }
      case "devolucao_aporte": {
        devolucoes += mv.valorCents;
        const l = mv.socioId ? linhas.get(mv.socioId) : undefined;
        if (l) l.devolvidoCents += mv.valorCents;
        break;
      }
      case "distribuicao_lucro": {
        distribuicoes += mv.valorCents;
        const l = mv.socioId ? linhas.get(mv.socioId) : undefined;
        if (l) l.lucroRecebidoCents += mv.valorCents;
        break;
      }
    }
  }

  const lista = [...linhas.values()];
  for (const l of lista) l.capitalCents = l.investidoCents - l.devolvidoCents;

  const capitalTotal = lista.reduce((n, l) => n + l.capitalCents, 0);
  // Só sócio ativo entra na divisão. Se um dia alguém sair, o capital dele
  // continua na história, mas a parte justa passa a ser entre os que ficam.
  const ativos = lista.filter((l) => socios.find((s) => s.id === l.id)?.ativo);
  const partes = dividirPorPeso(capitalTotal, ativos.map((l) => l.cotas));
  ativos.forEach((l, i) => (l.parteJustaCents = partes[i]));
  for (const l of lista) l.diferencaCents = l.capitalCents - l.parteJustaCents;

  // Taxa, estorno e etiqueta são pagos pela empresa: saem do caixa e contam
  // como gasto, exatamente como uma despesa lançada à mão paga pela empresa.
  const automaticosSaida = auto.taxasMpCents + auto.estornosCents + auto.etiquetasCents;
  const entradas = auto.vendasCents + receitas + aportes;
  const saidas = despesasEmpresa + automaticosSaida + devolucoes + distribuicoes;

  return {
    caixa: {
      vendasCents: auto.vendasCents,
      receitasCents: receitas,
      aportesCents: aportes,
      entradasCents: entradas,
      taxasMpCents: auto.taxasMpCents,
      estornosCents: auto.estornosCents,
      etiquetasCents: auto.etiquetasCents,
      despesasEmpresaCents: despesasEmpresa,
      devolucoesCents: devolucoes,
      distribuicoesCents: distribuicoes,
      saidasCents: saidas,
      saldoCents: entradas - saidas,
      aLiberarCents: auto.aLiberarCents,
    },
    capitalTotalCents: capitalTotal,
    despesasTotalCents: despesasTotal + auto.taxasMpCents + auto.etiquetasCents,
    socios: lista,
    previsto: { totalCents: previstoTotal, empresaCents: previstoEmpresa },
  };
}

export type Acerto = { deId: string; deNome: string; paraId: string; paraNome: string; valorCents: number };

/**
 * O menor número de acertos que deixa os três com o mesmo capital.
 *
 * Quem está abaixo da parte justa coloca dinheiro; quem está acima recebe.
 * Na prática o acerto passa pela empresa: quem deve faz um aporte, e a
 * empresa devolve o mesmo valor a quem tem a receber. O caixa não muda e o
 * livro fica com os dois lados registrados.
 */
export function acertos(linhas: LinhaSocio[]): Acerto[] {
  const devedores = linhas
    .filter((l) => l.diferencaCents < 0)
    .map((l) => ({ ...l, resta: -l.diferencaCents }))
    .sort((a, b) => b.resta - a.resta);
  const credores = linhas
    .filter((l) => l.diferencaCents > 0)
    .map((l) => ({ ...l, resta: l.diferencaCents }))
    .sort((a, b) => b.resta - a.resta);

  const saida: Acerto[] = [];
  let i = 0;
  let j = 0;
  while (i < devedores.length && j < credores.length) {
    const valor = Math.min(devedores[i].resta, credores[j].resta);
    if (valor > 0) {
      saida.push({
        deId: devedores[i].id,
        deNome: devedores[i].nome,
        paraId: credores[j].id,
        paraNome: credores[j].nome,
        valorCents: valor,
      });
    }
    devedores[i].resta -= valor;
    credores[j].resta -= valor;
    if (devedores[i].resta === 0) i++;
    if (credores[j].resta === 0) j++;
  }
  return saida;
}

/**
 * Teto de faturamento do MEI por ano, em centavos.
 *
 * R$ 81 mil até 2026. A Lei Complementar 238/2026 (sancionada em outubro de
 * 2026) sobe para R$ 110 mil em 2027 e R$ 140 mil a partir de 2028.
 */
export function limiteMeiCents(ano: number): number {
  if (ano <= 2026) return 81_000_00;
  if (ano === 2027) return 110_000_00;
  return 140_000_00;
}

/**
 * Lê um valor em reais do jeito que as pessoas digitam e devolve centavos.
 *
 * "1.234,56", "1234,56", "1234.56", "R$ 89,9" e "89" valem. O ponto é
 * ambíguo ("1.234" é mil e duzentos ou um real e vinte e três?), então a
 * regra é a brasileira: com vírgula presente, ponto é milhar; sem vírgula,
 * ponto seguido de exatamente três dígitos também é milhar. Errar aqui
 * multiplica ou divide um valor por cem, por isso tem teste para cada forma.
 * Devolve null para o que não dá para ler, em vez de adivinhar.
 */
export function parseReais(entrada: string): number | null {
  let t = (entrada ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) {
    // Milhar nunca começa com zero: "0.250" é vinte e cinco centavos, não
    // duzentos e cinquenta reais.
    t = t.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

// ── Resultado do mês (DRE gerencial) ─────────────────────────────────────
//
// A mesma estrutura que o Sebrae e qualquer contador usam para dizer se o mês
// deu lucro. Ela responde uma pergunta diferente da do caixa:
//
// - CAIXA: quanto dinheiro a empresa tem.
// - RESULTADO: se o que ela vendeu pagou o que custou.
//
// Por isso duas coisas que saem do caixa NÃO entram aqui:
// - Compra de estoque: as camisetas compradas viram custo só quando são
//   vendidas (o CMV, custo da mercadoria vendida). Comprar 200 camisetas
//   num mês e vender 20 não é prejuízo de 180 camisetas.
// - Equipamento: a prensa é investimento, dura anos, não é gasto de um mês.
// E distribuição de lucro também não entra: é o lucro sendo dividido, não um
// custo para gerar lucro.

export type Natureza = "variavel" | "fixa" | "imposto" | "estoque" | "investimento";

/** As categorias de gasto e o lugar de cada uma no resultado. */
export const CATEGORIAS_DESPESA: { nome: string; natureza: Natureza }[] = [
  { nome: "Estoque (peças)", natureza: "estoque" },
  { nome: "Equipamento", natureza: "investimento" },
  { nome: "Embalagem", natureza: "variavel" },
  { nome: "Frete e etiquetas", natureza: "variavel" },
  { nome: "Taxas (Mercado Pago, banco)", natureza: "variavel" },
  { nome: "Marketing e anúncios", natureza: "fixa" },
  { nome: "Sistemas e domínio", natureza: "fixa" },
  { nome: "Serviços (fotos, design)", natureza: "fixa" },
  { nome: "Impostos (DAS do MEI)", natureza: "imposto" },
  { nome: "Outros", natureza: "fixa" },
];

export function naturezaDe(categoria: string): Natureza {
  // Categoria desconhecida (digitada antes de uma mudança de nome, por
  // exemplo) conta como gasto fixo: na dúvida, o resultado fica menor, não
  // maior. Errar para o lado do lucro inventado é o erro que não pode.
  return CATEGORIAS_DESPESA.find((c) => c.nome === categoria)?.natureza ?? "fixa";
}

export type DadosMes = {
  vendasCents: number;
  receitasAvulsasCents: number;
  estornosCents: number;
  /** Custo das peças vendidas no mês. */
  cmvCents: number;
  /** Peças vendidas cujo custo não está informado: o lucro aparece maior do que é. */
  itensSemCusto: number;
  taxasMpCents: number;
  etiquetasCents: number;
  /** Gastos lançados à mão no mês, por categoria, não importa quem pagou. */
  despesasPorCategoria: Record<string, number>;
  metaCents: number | null;
};

export type Dre = {
  receitaBrutaCents: number;
  estornosCents: number;
  receitaLiquidaCents: number;
  cmvCents: number;
  lucroBrutoCents: number;
  variaveisCents: number;
  margemContribuicaoCents: number;
  /** Em décimos de por cento (285 = 28,5%), inteiro para não arredondar errado. */
  margemPermil: number | null;
  fixasCents: number;
  impostosCents: number;
  resultadoCents: number;
  /** Quanto vender no mês para empatar: gastos fixos divididos pela margem. */
  pontoEquilibrioCents: number | null;
  foraDoResultado: { estoqueCents: number; investimentoCents: number };
  meta: { metaCents: number; realizadoCents: number; permil: number } | null;
  avisos: string[];
};

export function calcularDre(d: DadosMes): Dre {
  const porNatureza: Record<Natureza, number> = { variavel: 0, fixa: 0, imposto: 0, estoque: 0, investimento: 0 };
  for (const [cat, v] of Object.entries(d.despesasPorCategoria)) porNatureza[naturezaDe(cat)] += v;

  const receitaBruta = d.vendasCents + d.receitasAvulsasCents;
  const receitaLiquida = receitaBruta - d.estornosCents;
  const lucroBruto = receitaLiquida - d.cmvCents;
  const variaveis = d.taxasMpCents + d.etiquetasCents + porNatureza.variavel;
  const margem = lucroBruto - variaveis;
  const fixas = porNatureza.fixa;
  const impostos = porNatureza.imposto;
  const resultado = margem - fixas - impostos;

  // Margem sobre a receita líquida. Sem receita não há margem, e sem margem
  // positiva não existe ponto de equilíbrio (nenhuma venda paga os fixos).
  const margemPermil = receitaLiquida > 0 ? Math.round((margem * 1000) / receitaLiquida) : null;
  const custoFixo = fixas + impostos;
  const pontoEquilibrio =
    margem > 0 && receitaLiquida > 0 ? Math.ceil((custoFixo * receitaLiquida) / margem) : null;

  const avisos: string[] = [];
  if (d.itensSemCusto > 0) {
    avisos.push(
      `${d.itensSemCusto} peça(s) vendida(s) sem custo informado no produto. O lucro aparece maior do que é até o custo ser preenchido.`,
    );
  }

  return {
    receitaBrutaCents: receitaBruta,
    estornosCents: d.estornosCents,
    receitaLiquidaCents: receitaLiquida,
    cmvCents: d.cmvCents,
    lucroBrutoCents: lucroBruto,
    variaveisCents: variaveis,
    margemContribuicaoCents: margem,
    margemPermil,
    fixasCents: fixas,
    impostosCents: impostos,
    resultadoCents: resultado,
    pontoEquilibrioCents: pontoEquilibrio,
    foraDoResultado: { estoqueCents: porNatureza.estoque, investimentoCents: porNatureza.investimento },
    meta:
      d.metaCents && d.metaCents > 0
        ? { metaCents: d.metaCents, realizadoCents: receitaBruta, permil: Math.round((receitaBruta * 1000) / d.metaCents) }
        : null,
    avisos,
  };
}
