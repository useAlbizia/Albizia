// Dias úteis no Brasil, para vencimentos. Boleto e fatura que vencem em fim
// de semana ou feriado podem ser pagos no próximo dia útil, então é essa a
// data que o calendário mostra e em que o lembrete chega.
//
// Feriados nacionais fixos mais os que dependem da Páscoa (Carnaval, Sexta-
// feira Santa, Corpus Christi), em que os bancos não abrem. Feriado estadual
// e municipal não entra: varia de cidade para cidade.

const FIXOS = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

const cache = new Map<number, Set<string>>();
export function feriadosDoAno(ano: number): Set<string> {
  const pronto = cache.get(ano);
  if (pronto) return pronto;
  const p = pascoa(ano);
  const s = new Set<string>([
    ...FIXOS.map((f) => `${ano}-${f}`),
    iso(somarDias(p, -48)), // segunda de Carnaval
    iso(somarDias(p, -47)), // terça de Carnaval
    iso(somarDias(p, -2)), // Sexta-feira Santa
    iso(somarDias(p, 60)), // Corpus Christi
  ]);
  cache.set(ano, s);
  return s;
}

export function ehDiaUtil(dataIso: string): boolean {
  const d = new Date(`${dataIso}T12:00:00Z`);
  const semana = d.getUTCDay();
  if (semana === 0 || semana === 6) return false;
  return !feriadosDoAno(d.getUTCFullYear()).has(dataIso);
}

/** A própria data se for dia útil; senão, o próximo dia útil. */
export function proximoDiaUtil(dataIso: string): string {
  let d = new Date(`${dataIso}T12:00:00Z`);
  for (let i = 0; i < 15 && !ehDiaUtil(iso(d)); i++) d = somarDias(d, 1);
  return iso(d);
}
