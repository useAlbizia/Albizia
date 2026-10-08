"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import {
  activeMeToken,
  faltaParaEtiqueta,
  getShippingSettings,
  servicosValidos,
  testMelhorEnvioToken,
} from "@/lib/shipping";

export type FreteState = { ok?: boolean; error?: string };

const schema = z.object({
  method: z.enum(["flat", "melhor_envio"]),
  flat: z.coerce.number().min(0).default(0),
  freeThreshold: z.coerce.number().min(0).default(0),
  meFromCep: z.string().max(9).default(""),
  meToken: z.string().default(""), // blank = keep current
  meEnvironment: z.enum(["production", "sandbox"]).default("production"),
  meWeight: z.coerce.number().int().min(1).default(300),
  meLength: z.coerce.number().int().min(1).default(20),
  meWidth: z.coerce.number().int().min(1).default(20),
  meHeight: z.coerce.number().int().min(1).default(4),
  // Remetente. A cotação precisa só do CEP, mas a COMPRA da etiqueta exige
  // tudo isto, e o Melhor Envio recusa o carrinho se faltar um campo.
  meFromName: z.string().max(120).default(""),
  meFromDocument: z.string().max(20).default(""),
  meFromPhone: z.string().max(20).default(""),
  meFromEmail: z.string().max(120).default(""),
  meFromAddress: z.string().max(160).default(""),
  meFromNumber: z.string().max(20).default(""),
  meFromComplement: z.string().max(80).default(""),
  meFromDistrict: z.string().max(80).default(""),
  meFromCity: z.string().max(80).default(""),
  meFromState: z.string().max(2).default(""),
});

export async function saveFrete(_prev: FreteState, formData: FormData): Promise<FreteState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    method: formData.get("method"),
    flat: formData.get("flat") ?? 0,
    freeThreshold: formData.get("freeThreshold") ?? 0,
    meFromCep: formData.get("meFromCep") ?? "",
    meToken: formData.get("meToken") ?? "",
    meEnvironment: formData.get("meEnvironment") ?? "production",
    meWeight: formData.get("meWeight") ?? 300,
    meLength: formData.get("meLength") ?? 20,
    meWidth: formData.get("meWidth") ?? 20,
    meHeight: formData.get("meHeight") ?? 4,
    meFromName: formData.get("meFromName") ?? "",
    meFromDocument: formData.get("meFromDocument") ?? "",
    meFromPhone: formData.get("meFromPhone") ?? "",
    meFromEmail: formData.get("meFromEmail") ?? "",
    meFromAddress: formData.get("meFromAddress") ?? "",
    meFromNumber: formData.get("meFromNumber") ?? "",
    meFromComplement: formData.get("meFromComplement") ?? "",
    meFromDistrict: formData.get("meFromDistrict") ?? "",
    meFromCity: formData.get("meFromCity") ?? "",
    meFromState: formData.get("meFromState") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const values: Record<string, unknown> = {
    shippingMethod: d.method,
    shippingFlatCents: Math.round(d.flat * 100),
    freeShippingThresholdCents: Math.round(d.freeThreshold * 100),
    updatedAt: new Date(),
  };

  // Os campos do Melhor Envio só existem no formulário quando o método
  // escolhido é Melhor Envio. Sem esta guarda, trocar para "frete fixo" e
  // salvar gravaria todos eles VAZIOS e apagaria o remetente inteiro, que
  // ninguém ia perceber até a primeira etiqueta falhar.
  if (formData.has("meFromCep")) {
    Object.assign(values, {
      meFromCep: d.meFromCep.trim(),
      meEnvironment: d.meEnvironment,
      meWeightGrams: d.meWeight,
      meLengthCm: d.meLength,
      meWidthCm: d.meWidth,
      meHeightCm: d.meHeight,
      meFromName: d.meFromName.trim(),
      meFromDocument: d.meFromDocument.replace(/\D/g, ""),
      meFromPhone: d.meFromPhone.trim(),
      meFromEmail: d.meFromEmail.trim(),
      meFromAddress: d.meFromAddress.trim(),
      meFromNumber: d.meFromNumber.trim(),
      meFromComplement: d.meFromComplement.trim(),
      meFromDistrict: d.meFromDistrict.trim(),
      meFromCity: d.meFromCity.trim(),
      meFromState: d.meFromState.trim().toUpperCase(),
      // Checkbox desmarcado não vai no formulário, e serviço bloqueado vem
      // desabilitado, então o que chega aqui é exatamente o que pode ser
      // oferecido.
      meServices: servicosValidos(formData.getAll("meServices").map(String).join(",")),
    });
  }
  // Only overwrite the token when a new one is actually provided.
  if (d.meToken.trim()) values.meToken = d.meToken.trim();

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  await logAudit({ action: "settings.frete", entity: "site_settings", entityId: "1", detail: { method: d.method } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/frete");
  return { ok: true };
}

export type FreteTestState = {
  ok?: boolean;
  error?: string;
  account?: string;
  ambiente?: string;
  falta?: string[];
};

// Confere o token salvo contra a API do Melhor Envio e diz de qual conta é.
// Sem isso, um token errado só aparece quando um cliente real tenta calcular
// frete e não recebe nenhuma opção.
export async function testarConexaoFrete(
  _prev: FreteTestState,
  _formData: FormData,
): Promise<FreteTestState> {
  await requireAdmin();

  // Usa o token do ambiente ATIVO, que pode vir da Vercel em vez do banco.
  // Testar o campo do banco enquanto a loja usa a variável de ambiente diria
  // "token inválido" sobre um token que a loja nem usa.
  const s = await getShippingSettings();
  const result = await testMelhorEnvioToken(activeMeToken(s), s.meEnvironment);
  if (!result.ok) return { error: result.message };

  return {
    ok: true,
    account: result.name || result.email || "conta conectada",
    ambiente: s.meEnvironment === "sandbox" ? "sandbox" : "produção",
    // Cotar funciona só com o CEP. Comprar etiqueta precisa do remetente
    // inteiro, e é melhor descobrir isso aqui do que na hora de despachar.
    falta: faltaParaEtiqueta(s),
  };
}
