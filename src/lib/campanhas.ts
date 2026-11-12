// Campanhas de frete por região: a conta, sem banco, para poder testar.
//
// Ações:
//   gratis          frete grátis
//   desconto_pct    frete X% mais barato
//   desconto_valor  R$ X a menos no frete
//   acrescimo_pct   frete X% mais caro (margem)
//   acrescimo_valor R$ X a mais no frete (margem)
//
// Quando várias valem para o mesmo CEP: os ACRÉSCIMOS somam, e dos
// DESCONTOS vale só o melhor para o cliente. Nunca fica negativo.

import { soDigitos, ufDoCep } from "@/lib/regioes";

export type AcaoCampanha = "gratis" | "desconto_pct" | "desconto_valor" | "acrescimo_pct" | "acrescimo_valor";

export type Campanha = {
  nome: string;
  ativo: boolean;
  inicio: string | null;
  fim: string | null;
  tipo: string; // "uf" | "cep"
  ufs: string[];
  cepInicio: string;
  cepFim: string;
  acao: string;
  /** Porcentagem (10 = 10%) ou centavos, conforme a ação. */
  valor: number;
  /** Só vale com compra (produtos) a partir deste valor, em centavos. 0 = sempre. */
  minimoCents: number;
};

export const ACOES: { v: AcaoCampanha; rotulo: string; unidade: "%" | "R$" | "" }[] = [
  { v: "gratis", rotulo: "Frete grátis", unidade: "" },
  { v: "desconto_pct", rotulo: "Desconto no frete (%)", unidade: "%" },
  { v: "desconto_valor", rotulo: "Desconto no frete (R$)", unidade: "R$" },
  { v: "acrescimo_pct", rotulo: "Acréscimo no frete (%)", unidade: "%" },
  { v: "acrescimo_valor", rotulo: "Acréscimo no frete (R$)", unidade: "R$" },
];

export const REGIOES: Record<string, string[]> = {
  Norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MS", "MT"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sul: ["PR", "RS", "SC"],
};

export function campanhaNoAr(c: Pick<Campanha, "ativo" | "inicio" | "fim">, hoje: string): boolean {
  if (!c.ativo) return false;
  if (c.inicio && hoje < c.inicio) return false;
  if (c.fim && hoje > c.fim) return false;
  return true;
}

export function valeParaCep(c: Pick<Campanha, "tipo" | "ufs" | "cepInicio" | "cepFim">, cep: string): boolean {
  const d = soDigitos(cep);
  if (d.length !== 8) return false;
  if (c.tipo === "uf") return c.ufs.includes(ufDoCep(d));
  if (c.tipo === "cep") {
    const n = Number(d);
    return n >= Number(soDigitos(c.cepInicio) || -1) && n <= Number(soDigitos(c.cepFim) || -1);
  }
  return false;
}

export function aplicarCampanhas(
  precoCents: number,
  cep: string,
  subtotalCents: number,
  campanhas: Campanha[],
  hoje: string,
): { precoCents: number; campanha: string | null } {
  const validas = campanhas.filter(
    (c) => campanhaNoAr(c, hoje) && valeParaCep(c, cep) && subtotalCents >= (c.minimoCents || 0),
  );
  if (validas.length === 0) return { precoCents, campanha: null };

  let preco = precoCents;
  for (const c of validas) {
    if (c.acao === "acrescimo_pct") preco += Math.round((precoCents * c.valor) / 100);
    if (c.acao === "acrescimo_valor") preco += c.valor;
  }
  let melhor: { preco: number; nome: string } | null = null;
  for (const c of validas) {
    let p: number | null = null;
    if (c.acao === "gratis") p = 0;
    if (c.acao === "desconto_pct") p = preco - Math.round((preco * Math.min(100, c.valor)) / 100);
    if (c.acao === "desconto_valor") p = preco - c.valor;
    if (p !== null && (!melhor || p < melhor.preco)) melhor = { preco: Math.max(0, p), nome: c.nome };
  }
  const final = melhor ? melhor.preco : preco;
  // O nome só aparece para o cliente quando é vantagem dele (desconto).
  return { precoCents: Math.max(0, final), campanha: melhor?.nome ?? null };
}
