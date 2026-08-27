"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { banners } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

export type BannerState = { ok?: boolean; error?: string };

function refresh() {
  revalidatePath("/"); // home
  revalidatePath("/admin/banners");
}

// Compresses an uploaded image to a wide hero JPEG and stores it in the
// product-images bucket (banners/ folder), returning the public URL.
async function uploadImage(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const jpeg = await sharp(buf)
    .resize(1920, 1080, { fit: "cover", position: "attention" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const path = `banners/${randomUUID()}.jpg`;
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${SUPA}/storage/v1/object/product-images/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, apikey: KEY, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: jpeg,
  });
  if (!res.ok) throw new Error(`upload ${res.status}`);
  return `${SUPA}/storage/v1/object/public/product-images/${path}`;
}

function fields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    ctaLabel: String(formData.get("ctaLabel") ?? "").trim(),
    ctaHref: String(formData.get("ctaHref") ?? "").trim(),
    align: (String(formData.get("align") ?? "center") as "left" | "center" | "right"),
  };
}

export async function createBanner(_prev: BannerState, formData: FormData): Promise<BannerState> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Envie uma imagem." };
  if (file.size > 10 * 1024 * 1024) return { error: "Imagem muito grande (máx. 10MB)." };

  let imageUrl: string;
  try {
    imageUrl = await uploadImage(file);
  } catch {
    return { error: "Falha ao enviar a imagem. Tente novamente." };
  }

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${banners.sortOrder}), -1)::int` })
    .from(banners);
  await db.insert(banners).values({ imageUrl, ...fields(formData), sortOrder: (max ?? -1) + 1 });
  await logAudit({ action: "banner.create", entity: "banner" });
  refresh();
  return { ok: true };
}

export async function updateBanner(id: string, _prev: BannerState, formData: FormData): Promise<BannerState> {
  await requireAdmin();
  const file = formData.get("image");
  const set: Record<string, unknown> = {
    ...fields(formData),
    sortOrder: Math.round(Number(formData.get("sortOrder") ?? 0)) || 0,
  };
  if (file instanceof File && file.size > 0) {
    try {
      set.imageUrl = await uploadImage(file);
    } catch {
      return { error: "Falha ao enviar a nova imagem." };
    }
  }
  await db.update(banners).set(set).where(eq(banners.id, id));
  await logAudit({ action: "banner.update", entity: "banner", entityId: id });
  refresh();
  return { ok: true };
}

export async function toggleBanner(id: string, active: boolean) {
  await requireAdmin();
  await db.update(banners).set({ active }).where(eq(banners.id, id));
  refresh();
}

export async function deleteBanner(id: string) {
  await requireAdmin();
  await db.delete(banners).where(eq(banners.id, id));
  await logAudit({ action: "banner.delete", entity: "banner", entityId: id });
  refresh();
}
