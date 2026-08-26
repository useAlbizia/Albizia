"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

export type FreteState = { ok?: boolean; error?: string };

const schema = z.object({
  method: z.enum(["flat", "melhor_envio"]),
  flat: z.coerce.number().min(0).default(0),
  freeThreshold: z.coerce.number().min(0).default(0),
  meFromCep: z.string().max(9).default(""),
  meToken: z.string().default(""), // blank = keep current
  meWeight: z.coerce.number().int().min(1).default(300),
  meLength: z.coerce.number().int().min(1).default(20),
  meWidth: z.coerce.number().int().min(1).default(20),
  meHeight: z.coerce.number().int().min(1).default(4),
});

export async function saveFrete(_prev: FreteState, formData: FormData): Promise<FreteState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    method: formData.get("method"),
    flat: formData.get("flat") ?? 0,
    freeThreshold: formData.get("freeThreshold") ?? 0,
    meFromCep: formData.get("meFromCep") ?? "",
    meToken: formData.get("meToken") ?? "",
    meWeight: formData.get("meWeight") ?? 300,
    meLength: formData.get("meLength") ?? 20,
    meWidth: formData.get("meWidth") ?? 20,
    meHeight: formData.get("meHeight") ?? 4,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  const values: Record<string, unknown> = {
    shippingMethod: d.method,
    shippingFlatCents: Math.round(d.flat * 100),
    freeShippingThresholdCents: Math.round(d.freeThreshold * 100),
    meFromCep: d.meFromCep.trim(),
    meWeightGrams: d.meWeight,
    meLengthCm: d.meLength,
    meWidthCm: d.meWidth,
    meHeightCm: d.meHeight,
    updatedAt: new Date(),
  };
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
