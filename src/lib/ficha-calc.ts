// Ficha técnica: quanto custa fazer UMA peça, a partir dos insumos.
//
// Funções puras, testadas em scripts/test-financeiro.ts.
//
// O PROBLEMA DO CENTAVO: insumo se compra em lote. 1.000 etiquetas por
// R$ 35,00 dá 3,5 centavos cada. Se cada etiqueta fosse arredondada para 4
// centavos, cada peça ficaria meio centavo mais cara, e numa ficha com cinco
// insumos pequenos o erro passa de dois centavos por peça. Por isso o custo do
// insumo é guardado como o lote inteiro ("paguei X por N unidades") e a conta
// carrega a fração até o fim, arredondando UMA vez, no total da peça.
//
// Quantidades são inteiras em milésimos (2,5 m = 2500), para aceitar metro
// de DTF e grama sem número quebrado no banco.

export type TipoInsumo = "peca" | "estampa" | "etiqueta" | "acabamento" | "embalagem_peca" | "embalagem_pedido" | "outro";

export const TIPOS_INSUMO: { v: TipoInsumo; nome: string; dica: string }[] = [
  { v: "peca", nome: "Peça lisa", dica: "A camiseta, regata ou peça base antes da estampa." },
  { v: "estampa", nome: "Estampa", dica: "DTF, autorrelevo, silk, bordado." },
  { v: "etiqueta", nome: "Etiqueta", dica: "Etiqueta de marca, de composição, de tamanho." },
  { v: "acabamento", nome: "Acabamento", dica: "Tag, cordão, lacre." },
  { v: "embalagem_peca", nome: "Embalagem da peça", dica: "O que vai em cada peça, como o ziplock." },
  { v: "embalagem_pedido", nome: "Embalagem do pedido", dica: "Uma por pedido, como o envelope de envio. Não entra na ficha da peça." },
  { v: "outro", nome: "Outro", dica: "" },
];

export const UNIDADES = ["un", "m", "cm", "g"] as const;
export type Unidade = (typeof UNIDADES)[number];

export type InsumoCusto = {
  /** Quanto se pagou pelo lote, em centavos. */
  loteValorCents: number;
  /** Quantas unidades vieram no lote, em milésimos (1.000 etiquetas = 1000000). */
  loteQuantidadeMil: number;
};

export type LinhaFicha = InsumoCusto & {
  /** Quanto deste insumo vai em UMA peça, em milésimos (1 un = 1000; 0,25 m = 250). */
  quantidadeMil: number;
};

/** Custo de uma linha da ficha, em centavos com fração (sem arredondar). */
export function custoLinhaExato(l: LinhaFicha): number {
  if (l.loteQuantidadeMil <= 0) return 0;
  return (l.loteValorCents * l.quantidadeMil) / l.loteQuantidadeMil;
}

/** Custo de uma unidade do insumo, em centavos com fração. Para mostrar na tela. */
export function custoUnitarioExato(i: InsumoCusto): number {
  if (i.loteQuantidadeMil <= 0) return 0;
  return (i.loteValorCents * 1000) / i.loteQuantidadeMil;
}

/**
 * Custo de UMA peça pela ficha, em centavos inteiros.
 *
 * Soma as frações e arredonda uma vez só, meio centavo para cima: na dúvida
 * o custo fica um pouco maior, e o lucro mostrado nunca é maior do que o
 * real. A normalização em 6 casas antes de arredondar existe porque, em
 * ponto flutuante, 2,5 pode chegar como 2,4999999999 e virar 2.
 */
export function custoDaFicha(linhas: LinhaFicha[]): number {
  const total = linhas.reduce((n, l) => n + custoLinhaExato(l), 0);
  const limpo = Math.round(total * 1e6) / 1e6;
  return Math.floor(limpo + 0.5);
}

/** Centavos com fração, do jeito que se lê: "3,5 centavos", "R$ 12,40", "R$ 0,035". */
export function formatarCustoExato(centavos: number): string {
  const limpo = Math.round(centavos * 1e4) / 1e4;
  if (limpo < 100) {
    const texto = limpo.toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
    return `${texto} ${limpo === 1 ? "centavo" : "centavos"}`;
  }
  const reais = (limpo / 100).toFixed(4).replace(/0{1,2}$/, "").replace(".", ",");
  return `R$ ${reais}`;
}

/**
 * Lê uma quantidade ("2,5", "0.25", "1.000", "3") e devolve milésimos.
 *
 * Mesma regra do valor em reais: com vírgula, ponto é milhar; sem vírgula,
 * ponto seguido de exatamente três dígitos é milhar ("1.000"), e qualquer
 * outro ponto é decimal ("0.25", "2.5"). null para o que não dá para ler.
 */
export function parseQuantidade(entrada: string): number | null {
  let t = (entrada ?? "").replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  // Milhar nunca começa com zero: "0.250" é um quarto, não duzentos e cinquenta.
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d{1,3})?$/.test(t)) return null;
  const v = Math.round(Number(t) * 1000);
  return v > 0 ? v : null;
}
