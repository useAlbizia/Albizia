import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";
import { computeShipping, type ShippingConfig } from "./shipping-calc";

// ── Swappable shipping strategy ──────────────────────────────────────────
// Everything else (checkout, order creation, MP preference) calls only
// `computeShipping` (pure, in ./shipping-calc) + `getShippingConfig`. Today
// it's an admin-configured flat rate with a free-shipping threshold. To move
// to a carrier API later (e.g. Melhor Envio for real-time rates by CEP),
// reimplement these two — the checkout and order flow stay untouched.

export { computeShipping };
export type { ShippingConfig };

export async function getShippingConfig(): Promise<ShippingConfig> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  return {
    flatCents: row?.shippingFlatCents ?? 0,
    freeThresholdCents: row?.freeShippingThresholdCents ?? 0,
  };
}
