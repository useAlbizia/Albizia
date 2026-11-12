"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type PedidoACaminho = { numero: number; codigo: string | null; href: string };

/**
 * Pedidos "a caminho" (enviados nos últimos 20 dias) de quem está vendo a
 * loja, para o aviso no canto da tela.
 *
 * Quem é o cliente: o login da conta, ou os pedidos que ESTE aparelho fez
 * (número + e-mail guardados na confirmação). Pedido lembrado só vale se o
 * número E o e-mail baterem, a mesma regra do Acompanhar pedido: ninguém vê
 * pedido de outra pessoa mudando um número.
 */
export async function pedidosACaminho(lembrados: { numero: number; email: string }[]): Promise<PedidoACaminho[]> {
  try {
    let emailLogado = "";
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      emailLogado = data.user?.email?.toLowerCase() ?? "";
    } catch {
      // Sem login: segue só com os lembrados.
    }
    const validos = (Array.isArray(lembrados) ? lembrados : [])
      .slice(0, 5)
      .filter((l) => Number.isInteger(l?.numero) && typeof l?.email === "string" && l.email.includes("@"));
    if (!emailLogado && validos.length === 0) return [];

    const recentes = and(
      eq(orders.status, "shipped"),
      sql`coalesce(${orders.meLabeledAt}, ${orders.updatedAt}) > now() - interval '20 days'`,
    );
    const encontrados = new Map<number, { numero: number; codigo: string | null; email: string }>();

    if (emailLogado) {
      const rows = await db
        .select({ numero: orders.orderNumber, codigo: orders.trackingCode, email: orders.customerEmail })
        .from(orders)
        .where(and(recentes, sql`lower(${orders.customerEmail}) = ${emailLogado}`))
        .orderBy(desc(orders.updatedAt))
        .limit(3);
      for (const r of rows) encontrados.set(r.numero, r);
    }
    if (validos.length) {
      const rows = await db
        .select({ numero: orders.orderNumber, codigo: orders.trackingCode, email: orders.customerEmail })
        .from(orders)
        .where(and(recentes, inArray(orders.orderNumber, validos.map((v) => v.numero))));
      for (const r of rows) {
        const bate = validos.some((v) => v.numero === r.numero && v.email.trim().toLowerCase() === r.email.toLowerCase());
        if (bate) encontrados.set(r.numero, r);
      }
    }
    return [...encontrados.values()].map((r) => ({
      numero: r.numero,
      codigo: r.codigo,
      href: r.codigo
        ? `https://www.melhorrastreio.com.br/app/${encodeURIComponent(r.codigo)}`
        : `/acompanhar?numero=${r.numero}&email=${encodeURIComponent(r.email)}`,
    }));
  } catch {
    return [];
  }
}
