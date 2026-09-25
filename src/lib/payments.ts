import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";

// ── Mercado Pago credentials ─────────────────────────────────────────────
// Kept in Admin → Pagamentos so the founder can connect the account without a
// redeploy. Falls back to the environment variables so existing deploys keep
// working until the admin form is filled in.
//
//  - accessToken is a SECRET: read only on the server, never serialized to the
//    browser. It can charge money, so it never leaves this process.
//  - publicKey is meant to be public. The Payment Brick needs it in the client
//    to tokenize the card, which is exactly why the card number never reaches
//    our server.

export type PaymentSettings = {
  publicKey: string;
  accessToken: string; // SECRET — never send to the client
};

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  return {
    publicKey: row?.mpPublicKey || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
    accessToken: row?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || "",
  };
}

// The only piece of the payment config that may cross to the browser.
export async function getPaymentPublicKey(): Promise<string> {
  return (await getPaymentSettings()).publicKey;
}

// Whether the store can actually take a payment right now. The checkout uses
// this to show a clear message instead of a broken payment form.
export async function isPaymentConfigured(): Promise<boolean> {
  const s = await getPaymentSettings();
  return !!s.accessToken && !!s.publicKey;
}

// Mercado Pago test credentials start with TEST-, production ones with
// APP_USR-. Surfacing this in the admin stops the classic "we went live still
// in sandbox and took no real money" failure.
export function isTestCredential(value: string): boolean {
  return value.trim().toUpperCase().startsWith("TEST-");
}

export type CredentialCheck =
  | { ok: true; email: string; nickname: string; isTest: boolean }
  | { ok: false; message: string };

// Validates an access token against the Mercado Pago API so a typo is caught
// in the admin instead of on a customer's first real purchase.
export async function testMercadoPagoCredentials(accessToken: string): Promise<CredentialCheck> {
  const token = accessToken.trim();
  if (!token) return { ok: false, message: "Informe o Access Token." };

  try {
    const res = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        message:
          res.status === 401
            ? "Credencial inválida ou expirada. Confira se copiou o Access Token completo."
            : `O Mercado Pago respondeu com erro ${res.status}.`,
      };
    }

    const data = (await res.json()) as { email?: string; nickname?: string };
    return {
      ok: true,
      email: data.email ?? "",
      nickname: data.nickname ?? "",
      isTest: isTestCredential(token),
    };
  } catch {
    return { ok: false, message: "Não foi possível falar com o Mercado Pago. Tente de novo." };
  }
}
