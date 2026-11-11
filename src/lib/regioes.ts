// Regiões: de qual estado é cada CEP, e as regras de prazo extra.
// Funções puras aqui; o que lê o banco fica em regioes-db.ts.

// Faixas oficiais de CEP por estado (Correios). Alguns estados têm duas.
const FAIXAS: [number, number, string][] = [
  [1000, 19999, "SP"], [20000, 28999, "RJ"], [29000, 29999, "ES"], [30000, 39999, "MG"],
  [40000, 48999, "BA"], [49000, 49999, "SE"], [50000, 56999, "PE"], [57000, 57999, "AL"],
  [58000, 58999, "PB"], [59000, 59999, "RN"], [60000, 63999, "CE"], [64000, 64999, "PI"],
  [65000, 65999, "MA"], [66000, 68899, "PA"], [68900, 68999, "AP"], [69000, 69299, "AM"],
  [69300, 69399, "RR"], [69400, 69899, "AM"], [69900, 69999, "AC"], [70000, 72799, "DF"],
  [72800, 72999, "GO"], [73000, 73699, "DF"], [73700, 76799, "GO"], [76800, 76999, "RO"],
  [77000, 77999, "TO"], [78000, 78899, "MT"], [79000, 79999, "MS"], [80000, 87999, "PR"],
  [88000, 89999, "SC"], [90000, 99999, "RS"],
];

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

export const NOME_UF: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

export const soDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

/** "20040-002" → "RJ". Vazio se o CEP não for válido. */
export function ufDoCep(cep: string): string {
  const d = soDigitos(cep);
  if (d.length !== 8) return "";
  const prefixo = Number(d.slice(0, 5));
  return FAIXAS.find(([a, b]) => prefixo >= a && prefixo <= b)?.[2] ?? "";
}

export type RegraPrazo = { tipo: string; uf: string; cepInicio: string; cepFim: string; diasExtra: number; ativo: boolean };

/**
 * Dias a somar no prazo para este CEP. Se várias regras valem (o estado
 * inteiro e uma faixa dentro dele), vale a MAIOR: prazo prometido a menos é
 * o que gera reclamação; a mais, o cliente recebe antes e fica feliz.
 */
export function prazoExtra(cep: string, regras: RegraPrazo[]): number {
  const d = soDigitos(cep);
  if (d.length !== 8) return 0;
  const uf = ufDoCep(d);
  const n = Number(d);
  let extra = 0;
  for (const r of regras) {
    if (!r.ativo) continue;
    const vale =
      r.tipo === "uf"
        ? r.uf === uf
        : r.tipo === "cep" && n >= Number(soDigitos(r.cepInicio) || -1) && n <= Number(soDigitos(r.cepFim) || -1);
    if (vale) extra = Math.max(extra, r.diasExtra);
  }
  return extra;
}
