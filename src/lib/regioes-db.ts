import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders, regrasPrazo, retiradaConfig } from "@/lib/db/schema";
import { NOME_UF, prazoExtra, ufDoCep, type RegraPrazo } from "@/lib/regioes";

export async function listarRegrasPrazo() {
  try {
    return await db.select().from(regrasPrazo).orderBy(asc(regrasPrazo.createdAt));
  } catch {
    return [];
  }
}

/** Dias extras para o CEP, pelas regras ativas. Nunca falha: erro vira 0. */
export async function diasExtraPara(cep: string): Promise<number> {
  try {
    const regras = (await db.select().from(regrasPrazo).where(eq(regrasPrazo.ativo, true))) as RegraPrazo[];
    return prazoExtra(cep, regras);
  } catch {
    return 0;
  }
}

export type Retirada = { ativo: boolean; endereco: string; instrucoes: string; prazoDias: number };

export async function lerRetirada(): Promise<Retirada> {
  try {
    const r = await db.query.retiradaConfig.findFirst({ where: eq(retiradaConfig.id, "config") });
    return {
      ativo: !!r?.ativo && !!r?.endereco?.trim(),
      endereco: r?.endereco ?? "",
      instrucoes: r?.instrucoes ?? "",
      prazoDias: r?.prazoDias ?? 1,
    };
  } catch {
    return { ativo: false, endereco: "", instrucoes: "", prazoDias: 1 };
  }
}

/** A opção "Retirar no local" no checkout, id 0, quando a retirada está ligada. */
export const ID_RETIRADA = 0;
export async function opcaoRetirada() {
  const r = await lerRetirada();
  if (!r.ativo) return null;
  return { id: ID_RETIRADA, name: "Retirar no local", company: "ALBIZIA", priceCents: 0, deliveryDays: r.prazoDias };
}

export type VendaRegiao = { uf: string; nome: string; pedidos: number; totalCents: number };
export type VendaCidade = { cidade: string; uf: string; pedidos: number; totalCents: number };

/**
 * Vendas por estado e por cidade no período. O estado vem do endereço de
 * entrega; se faltar, do CEP. Só pedidos pagos ou enviados.
 */
export async function vendasPorRegiao(dias: number | null): Promise<{ estados: VendaRegiao[]; cidades: VendaCidade[] }> {
  const rows = await db
    .select({
      endereco: orders.shippingAddress,
      total: orders.totalCents,
    })
    .from(orders)
    .where(
      and(
        sql`${orders.status} in ('paid', 'shipped')`,
        sql`coalesce(${orders.mpStatus}, '') not in ('refunded', 'charged_back')`,
        dias ? sql`coalesce(${orders.paidAt}, ${orders.createdAt}) > now() - make_interval(days => ${dias})` : undefined,
      ),
    );
  const estados = new Map<string, VendaRegiao>();
  const cidades = new Map<string, VendaCidade>();
  for (const r of rows) {
    const e = (r.endereco ?? {}) as { state?: string; city?: string; zip?: string };
    const uf = (e.state || ufDoCep(e.zip ?? "") || "").toUpperCase().slice(0, 2);
    if (!uf) continue;
    const est = estados.get(uf) ?? { uf, nome: NOME_UF[uf] ?? uf, pedidos: 0, totalCents: 0 };
    est.pedidos++;
    est.totalCents += r.total;
    estados.set(uf, est);
    const cidade = (e.city ?? "").trim();
    if (cidade) {
      const k = `${cidade.toLowerCase()}|${uf}`;
      const c = cidades.get(k) ?? { cidade, uf, pedidos: 0, totalCents: 0 };
      c.pedidos++;
      c.totalCents += r.total;
      cidades.set(k, c);
    }
  }
  const porTotal = <T extends { totalCents: number }>(a: T, b: T) => b.totalCents - a.totalCents;
  return { estados: [...estados.values()].sort(porTotal), cidades: [...cidades.values()].sort(porTotal).slice(0, 15) };
}
