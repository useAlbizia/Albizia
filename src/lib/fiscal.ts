// Apoio à emissão de nota fiscal.
//
// O objetivo aqui é acabar com a digitação manual: a loja já sabe quem
// comprou, o que comprou, por quanto e para onde vai. O que faltava era o
// CPF do destinatário e o NCM de cada item, que a NF-e exige e que agora
// são coletados.
//
// IMPORTANTE: NCM, CFOP e regime tributário mudam conforme a operação e o
// enquadramento da empresa. Os padrões abaixo cobrem o caso comum de revenda
// de vestuário, mas DEVEM ser confirmados com o contador antes da primeira
// emissão. Este arquivo não substitui contador.

// ── Documento do destinatário ────────────────────────────────────────────

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

// Valida CPF pelos dígitos verificadores. Rejeita os repetidos (111.111...),
// que passam no cálculo mas não existem.
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return (
    digito(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    digito(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calc = (base: string): number => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    calc(cnpj.slice(0, 12)) === Number(cnpj[12]) && calc(cnpj.slice(0, 13)) === Number(cnpj[13])
  );
}

// Aceita CPF ou CNPJ: pessoa jurídica também compra.
export function isValidDocument(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
}

export function formatDocument(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

// ── Classificação fiscal ─────────────────────────────────────────────────

// NCM padrão por categoria, usado quando o produto não tem o seu próprio.
// Evita preencher peça por peça quando a loja vende sempre o mesmo tipo.
const NCM_POR_CATEGORIA: Record<string, string> = {
  // Camisetas de malha, de algodão.
  camiseta: "61091000",
  // Calções e sungas de banho, masculinos.
  "moda-praia": "62111100",
};

const NCM_FALLBACK = "61091000";

export function ncmFor(category: string, ncmDoProduto?: string | null): string {
  const proprio = onlyDigits(ncmDoProduto ?? "");
  if (proprio.length === 8) return proprio;
  return NCM_POR_CATEGORIA[category] ?? NCM_FALLBACK;
}

// CFOP de venda de mercadoria: 5102 dentro do estado, 6102 para fora.
// (Se a loja fabricar em vez de revender, o contador vai pedir 5101/6101.)
export function cfopFor(ufOrigem: string, ufDestino: string): string {
  const o = (ufOrigem || "").trim().toUpperCase();
  const d = (ufDestino || "").trim().toUpperCase();
  if (!o || !d) return "";
  return o === d ? "5102" : "6102";
}

// ── Exportação ───────────────────────────────────────────────────────────

// CSV com ponto e vírgula e BOM: é o que o Excel brasileiro abre sem
// embaralhar acento nem juntar tudo numa coluna só.
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number): string => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))];
  return "﻿" + linhas.join("\r\n");
}

// Valor em reais com vírgula decimal, como o Excel brasileiro e os emissores
// esperam. Sem separador de milhar, que quebraria o parse.
export function reais(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
