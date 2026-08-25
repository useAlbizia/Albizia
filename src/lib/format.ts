// Client-safe formatting helpers (no server-only imports).

/** Integer cents → "R$ 1.234,56". */
export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** A Date → "24/08/2026". */
export function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("pt-BR");
}

/** A Date → "24/08/2026 14:03". */
export function dateTime(d: Date | string): string {
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
