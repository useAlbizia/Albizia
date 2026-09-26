import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";
import { getValidAccessToken } from "./mercadopago-oauth";

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

  // Com a conta conectada por OAuth, o token vence e precisa ser renovado.
  // getValidAccessToken renova com antecedência, para a renovação nunca cair
  // no meio de uma compra. Sem OAuth, vale o que foi colado à mão.
  const accessToken = row?.mpRefreshToken
    ? await getValidAccessToken()
    : row?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || "";

  return {
    publicKey: row?.mpPublicKey || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "",
    accessToken,
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

// NÃO DÁ para saber se a credencial é de teste olhando o texto dela.
//
// O formato antigo usava prefixo TEST-, e uma versão anterior deste arquivo
// checava isso. Está errado no Mercado Pago atual: as credenciais de TESTE
// também começam com APP_USR-. O painel chegou a dizer "produção" para uma
// credencial de teste por causa disso, que é pior do que não dizer nada.
//
// O que separa as duas é o seletor "Teste / Produtivas" no painel do Mercado
// Pago, no momento de copiar. Isso não viaja junto com a chave.
//
// Onde dá para saber de verdade é no OAuth: a resposta do token traz
// live_mode. Por isso a conexão por botão é também mais confiável que colar
// chave à mão.
export function isTestCredential(_value: string): boolean {
  return false;
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
    // isTest fica sempre false: o texto da credencial não diz o ambiente.
    // Quem informa isso de verdade é o seletor Teste/Produtivas no painel do
    // Mercado Pago, na hora de copiar.
    return {
      ok: true,
      email: data.email ?? "",
      nickname: data.nickname ?? "",
      isTest: false,
    };
  } catch {
    return { ok: false, message: "Não foi possível falar com o Mercado Pago. Tente de novo." };
  }
}
