"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { getPaymentSettings, isTestCredential, testMercadoPagoCredentials } from "@/lib/payments";

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

  // A mismatched pair (one TEST, one production) silently breaks the checkout,
  // so it is worth calling out at save time rather than at the first sale.
  const effectiveToken = accessToken || (await getPaymentSettings()).accessToken;
  const pkTest = isTestCredential(publicKey);
  const atTest = isTestCredential(effectiveToken);

  if (publicKey && effectiveToken && pkTest !== atTest) {
    return {
      ok: true,
      warning:
        "Atenção: uma credencial é de teste e a outra é de produção. As duas precisam ser do mesmo ambiente.",
    };
  }
  if (pkTest || atTest) {
    return {
      ok: true,
      warning: "Credenciais de TESTE salvas. Nenhuma cobrança real será feita neste modo.",
    };
  }
  return { ok: true };
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
