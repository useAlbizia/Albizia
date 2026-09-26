// Client-safe formatting helpers (no server-only imports).

// POR QUE TODO FORMATO DE DATA FIXA O FUSO:
//
// Estas funções rodam tanto no navegador quanto no servidor. O servidor da
// Vercel roda em UTC, então uma data formatada lá saía três horas adiantada:
// o painel chegou a mostrar um acesso às 13:38 quando eram 10:39 no Brasil.
// Data no futuro destrói a confiança em tudo que a tela diz.
//
// A loja é brasileira e vende em horário de Brasília, então é esse o fuso
// certo em qualquer lugar de onde o painel for aberto.
const TZ = "America/Sao_Paulo";

/** Integer cents → "R$ 1.234,56". */
export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** A Date → "24/08/2026" (horário de Brasília). */
export function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** A Date → "24/08/2026 14:03" (horário de Brasília). */
export function dateTime(d: Date | string): string {
  return new Date(d).toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A Date → "24 de agosto de 2026" (horário de Brasília). */
export function longDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const partesDoDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * A Date → "2026-08-24", o dia em Brasília.
 *
 * Serve para agrupar e casar chaves de dia. `toISOString().slice(0,10)` parece
 * fazer o mesmo, mas devolve o dia em UTC: depois das 21h em Brasília ele já
 * virou o dia seguinte, e a chave deixa de casar com o que o banco agrupou.
 */
export function isoDay(d: Date | string | number): string {
  const p = partesDoDia.formatToParts(new Date(d));
  const parte = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}
