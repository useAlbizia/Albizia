"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { siteSettings, legalPages } from "@/lib/db/schema";

export type ContentState = { ok?: boolean; error?: string };

const settingsSchema = z.object({
  companyName: z.string().max(120).default(""),
  cnpj: z.string().max(30).default(""),
  contactEmail: z.string().max(160).default(""),
  contactPhone: z.string().max(40).default(""),
  address: z.string().max(240).default(""),
  instagram: z.string().max(60).default(""),
});

export async function saveSettings(
  _prev: ContentState,
  formData: FormData
): Promise<ContentState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    companyName: formData.get("companyName") ?? "",
    cnpj: formData.get("cnpj") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    address: formData.get("address") ?? "",
    instagram: formData.get("instagram") ?? "",
  });
  if (!parsed.success) return { error: "Dados inválidos." };

  await db
    .insert(siteSettings)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.id, set: { ...parsed.data, updatedAt: new Date() } });

  revalidatePath("/", "layout"); // footer shows everywhere
  return { ok: true };
}

const legalSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1, "Título obrigatório"),
  body: z.string().default(""),
});

export async function saveLegalPage(
  _prev: ContentState,
  formData: FormData
): Promise<ContentState> {
  await requireAdmin();
  const parsed = legalSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  await db
    .update(legalPages)
    .set({ title: parsed.data.title, body: parsed.data.body, updatedAt: new Date() })
    .where(eq(legalPages.slug, parsed.data.slug));

  revalidatePath(`/${parsed.data.slug}`);
  revalidatePath("/admin/conteudo");
  return { ok: true };
}
