"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { getPaymentSettings, isTestCredential, testMercadoPagoCredentials } from "@/lib/payments";
import { disconnect } from "@/lib/mercadopago-oauth";

export type PagamentosState = { ok?: boolean; error?: string; warning?: string };

const schema = z.object({
  publicKey: z.string().max(200).default(""),
  accessToken: z.string().max(500).default(""), // blank = keep current
});

export async function savePagamentos(
  _prev: PagamentosState,
  formData: FormData,
): Promise<PagamentosState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    publicKey: formData.get("publicKey") ?? "",
    accessToken: formData.get("accessToken") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const publicKey = parsed.data.publicKey.trim();
  const accessToken = parsed.data.accessToken.trim();

  const values: Record<string, unknown> = { mpPublicKey: publicKey, updatedAt: new Date() };
  // Only overwrite the secret when a new one is actually typed, so re-saving
  // the form without retyping it does not wipe the stored token.
  if (accessToken) values.mpAccessToken = accessToken;

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  // Never log the credential itself, only that it was rotated.
  await logAudit({
    action: "settings.pagamentos",
    entity: "site_settings",
    entityId: "1",
    detail: { tokenChanged: !!accessToken },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/pagamentos");

  // Não dá para avisar "isto é teste" olhando a chave: no Mercado Pago atual
  // as credenciais de teste e de produção começam iguais (APP_USR-). O aviso
  // aqui é honesto sobre isso em vez de dar uma garantia que não existe.
  const tokenEfetivo = accessToken || (await getPaymentSettings()).accessToken;
  if (publicKey && tokenEfetivo) {
    return {
      ok: true,
      warning:
        "Salvo. Confirme no painel do Mercado Pago que você copiou da aba Produtivas, e não de Teste: as duas chaves começam igual e não há como diferenciar por aqui.",
    };
  }
  return { ok: true };
}

export type AppState = { ok?: boolean; error?: string };

// Dados da APLICAÇÃO (client_id e secret). É a configuração de quem
// desenvolve, feita uma vez. Depois disso, conectar a conta que recebe é só
// clicar num botão, sem ninguém copiar chave.
export async function saveMpApp(_prev: AppState, formData: FormData): Promise<AppState> {
  await requireAdmin();

  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecret = String(formData.get("clientSecret") ?? "").trim();

  if (!clientId) return { error: "Informe o número da aplicação." };
  if (!/^\d+$/.test(clientId)) return { error: "O número da aplicação só tem dígitos." };

  const values: Record<string, unknown> = { mpClientId: clientId, updatedAt: new Date() };
  // Segredo só é sobrescrito quando um novo é digitado.
  if (clientSecret) values.mpClientSecret = clientSecret;

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  await logAudit({
    action: "pagamentos.app_mp",
    entity: "site_settings",
    entityId: "1",
    detail: { clientId, secretChanged: !!clientSecret },
  });

  revalidatePath("/admin/pagamentos");
  return { ok: true };
}

export type DisconnectState = { ok?: boolean; error?: string };

export async function desconectarMp(): Promise<void> {
  await requireAdmin();
  await disconnect();
  await logAudit({ action: "pagamentos.desconectar_mp", entity: "site_settings", entityId: "1" });
  revalidatePath("/admin/pagamentos");
}

export type TestState = {
  ok?: boolean;
  error?: string;
  account?: string;
  isTest?: boolean;
};

// Checks the stored Access Token against the Mercado Pago API and reports which
// account it belongs to, so the founder can confirm it is the right one before
// the first real sale.
export async function testarConexao(_prev: TestState, _formData: FormData): Promise<TestState> {
  await requireAdmin();

  const { accessToken } = await getPaymentSettings();
  if (!accessToken) return { error: "Nenhum Access Token salvo ainda." };

  const result = await testMercadoPagoCredentials(accessToken);
  if (!result.ok) return { error: result.message };

  return {
    ok: true,
    account: result.nickname || result.email || "conta conectada",
    isTest: result.isTest,
  };
}
