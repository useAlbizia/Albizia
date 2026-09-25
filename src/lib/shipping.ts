import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";
import { computeShipping, type ShippingConfig } from "./shipping-calc";

// ── Swappable shipping strategy ──────────────────────────────────────────
// Two methods, chosen in Admin → Frete:
//  - "flat": an admin-set national rate + free-above threshold (computeShipping).
//  - "melhor_envio": live carrier rates by CEP via the Melhor Envio API.
// The checkout and order flow call quoteShipping()/getShippingConfig() only —
// swapping carriers later means changing this file, nothing else.

export { computeShipping };
export type { ShippingConfig };

export type ShippingSettings = {
  method: "flat" | "melhor_envio";
  flatCents: number;
  freeThresholdCents: number;
  meToken: string; // SECRET — never send to the client
  meFromCep: string;
  meWeightGrams: number;
  meLengthCm: number;
  meWidthCm: number;
  meHeightCm: number;
};

// Full shipping settings, INCLUDING the Melhor Envio token. Server-only — never
// expose the return value (or meToken) to the client.
export async function getShippingSettings(): Promise<ShippingSettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  return {
    method: (row?.shippingMethod as "flat" | "melhor_envio") ?? "flat",
    flatCents: row?.shippingFlatCents ?? 0,
    freeThresholdCents: row?.freeShippingThresholdCents ?? 0,
    meToken: row?.meToken ?? "",
    meFromCep: row?.meFromCep ?? "",
    meWeightGrams: row?.meWeightGrams ?? 300,
    meLengthCm: row?.meLengthCm ?? 20,
    meWidthCm: row?.meWidthCm ?? 20,
    meHeightCm: row?.meHeightCm ?? 4,
  };
}

// The flat config used by the cart/checkout preview (no CEP needed). For
// Melhor Envio the real price only exists once a CEP is entered.
export async function getShippingConfig(): Promise<ShippingConfig> {
  const s = await getShippingSettings();
  return { flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents };
}

export type MeCredentialCheck =
  | { ok: true; name: string; email: string; firstName: string }
  | { ok: false; message: string };

// Valida o token do Melhor Envio contra a API e diz de qual conta ele é, para
// o fundador confirmar a conexão no admin em vez de descobrir que está errado
// na primeira cotação de um cliente real.
export async function testMelhorEnvioToken(token: string): Promise<MeCredentialCheck> {
  const t = token.trim();
  if (!t) return { ok: false, message: "Nenhum token salvo ainda." };

  try {
    const res = await fetch("https://www.melhorenvio.com.br/api/v2/me", {
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: "application/json",
        "User-Agent": "ALBIZIA (contato@usealbizia.com.br)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        message:
          res.status === 401
            ? "Token inválido ou expirado. Gere um novo em Melhor Envio, Integrações, Tokens."
            : `O Melhor Envio respondeu com erro ${res.status}.`,
      };
    }

    const data = (await res.json()) as {
      firstname?: string;
      lastname?: string;
      email?: string;
    };
    const firstName = data.firstname ?? "";
    return {
      ok: true,
      firstName,
      name: [data.firstname, data.lastname].filter(Boolean).join(" "),
      email: data.email ?? "",
    };
  } catch {
    return { ok: false, message: "Não foi possível falar com o Melhor Envio. Tente de novo." };
  }
}

export type ShippingOption = {
  id: number;
  name: string; // e.g. "PAC", "SEDEX"
  company: string; // e.g. "Correios"
  priceCents: number;
  deliveryDays: number | null;
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Live quote from Melhor Envio for one destination CEP, using the package
// defaults set in the admin. Returns [] on any failure so the checkout can fall
// back gracefully — quoting must never break a sale.
export async function quoteMelhorEnvio(
  toCep: string,
  qty: number,
  settings?: ShippingSettings
): Promise<ShippingOption[]> {
  const s = settings ?? (await getShippingSettings());
  const from = onlyDigits(s.meFromCep);
  const to = onlyDigits(toCep);
  if (!s.meToken || from.length !== 8 || to.length !== 8) return [];

  try {
    const res = await fetch(
      "https://www.melhorenvio.com.br/api/v2/me/shipment/calculate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${s.meToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "ALBIZIA (contato@usealbizia.com.br)",
        },
        body: JSON.stringify({
          from: { postal_code: from },
          to: { postal_code: to },
          package: {
            weight: Math.max(0.05, (s.meWeightGrams * Math.max(1, qty)) / 1000),
            width: s.meWidthCm,
            height: s.meHeightCm * Math.max(1, qty),
            length: s.meLengthCm,
          },
          options: { receipt: false, own_hand: false },
        }),
      }
    );
    if (!res.ok) {
      console.error("Melhor Envio quote failed", res.status, await res.text().catch(() => ""));
      return [];
    }
    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      price: string;
      delivery_time?: number;
      company?: { name?: string };
      error?: string;
    }>;
    return data
      .filter((o) => !o.error && o.price)
      .map((o) => ({
        id: o.id,
        name: o.name,
        company: o.company?.name ?? "",
        priceCents: Math.round(parseFloat(o.price) * 100),
        deliveryDays: o.delivery_time ?? null,
      }))
      .sort((a, b) => a.priceCents - b.priceCents);
  } catch (err) {
    console.error("Melhor Envio quote error", err);
    return [];
  }
}

// The authoritative shipping charge for an order. Flat method → computeShipping.
// Melhor Envio → cheapest live option for the CEP (falling back to the flat rate
// if the carrier can't be reached), with the free-shipping threshold honored.
export async function quoteShipping(
  toCep: string,
  subtotalCents: number,
  qty: number
): Promise<number> {
  const s = await getShippingSettings();

  if (s.freeThresholdCents > 0 && subtotalCents >= s.freeThresholdCents) return 0;

  if (s.method === "melhor_envio") {
    const options = await quoteMelhorEnvio(toCep, qty, s);
    if (options.length > 0) return options[0].priceCents;
    // Carrier unreachable → fall back to the flat rate so checkout still works.
  }
  return computeShipping(subtotalCents, { flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents }, toCep);
}
