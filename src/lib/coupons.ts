import "server-only";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "./db/client";
import { coupons, orders } from "./db/schema";

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export type CouponResult =
  | { ok: true; code: string; discountCents: number; label: string }
  | { ok: false; message: string };

// Validates a code against a subtotal and returns the discount it would grant.
// This is the single source of truth — both the checkout preview and the
// authoritative order creation call it, so they can never disagree.
export async function validateCoupon(
  rawCode: string,
  subtotalCents: number,
  /** No fechamento do pedido: para o cupom de uso único por cliente. */
  cliente?: { email?: string; documento?: string }
): Promise<CouponResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: "Informe um cupom." };

  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (!coupon || !coupon.active) return { ok: false, message: "Cupom inválido." };

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Cupom expirado." };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: "Cupom esgotado." };
  }
  // Uso único por cliente: já existe pedido pago desse e-mail ou CPF com este
  // cupom? (Pedido só pago conta: quem desistiu no pagamento pode tentar de novo.)
  if (coupon.umaVezPorCliente && cliente && (cliente.email || cliente.documento)) {
    const email = (cliente.email ?? "").trim().toLowerCase();
    const doc = (cliente.documento ?? "").replace(/\D/g, "");
    const [ja] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.couponCode, coupon.code),
          inArray(orders.status, ["paid", "shipped"]),
          or(
            email ? sql`lower(${orders.customerEmail}) = ${email}` : sql`false`,
            doc.length >= 11 ? sql`regexp_replace(${orders.customerDocument}, '\\D', '', 'g') = ${doc}` : sql`false`,
          ),
        ),
      )
      .limit(1);
    if (ja) return { ok: false, message: "Este cupom é de uso único e você já usou." };
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    const min = (coupon.minSubtotalCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return { ok: false, message: `Este cupom exige um mínimo de ${min}.` };
  }

  const raw =
    coupon.type === "percent"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : coupon.value;
  const discountCents = Math.max(0, Math.min(raw, subtotalCents));
  const label = coupon.type === "percent" ? `${coupon.value}% OFF` : "Desconto";

  return { ok: true, code: coupon.code, discountCents, label };
}

// Called from the payment webhook once an order that used a coupon is paid, so
// usage is only ever counted for real (paid) conversions.
export async function incrementCouponUse(code: string): Promise<void> {
  await db
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(eq(coupons.code, normalizeCode(code)));
}
