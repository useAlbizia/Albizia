"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { coupons } from "@/lib/db/schema";
import { normalizeCode } from "@/lib/coupons";
import { logAudit } from "@/lib/audit";

export type CouponState = { ok?: boolean; error?: string };

const schema = z.object({
  code: z.string().min(2, "Código muito curto").max(40),
  type: z.enum(["percent", "fixed"]),
  // For percent: 1–100. For fixed: reais (converted to cents below).
  value: z.coerce.number().positive("Valor inválido"),
  minSubtotal: z.coerce.number().min(0).default(0),
  maxUses: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function createCoupon(_prev: CouponState, formData: FormData): Promise<CouponState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    minSubtotal: formData.get("minSubtotal") ?? 0,
    maxUses: formData.get("maxUses") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  if (d.type === "percent" && (d.value < 1 || d.value > 100)) {
    return { error: "Percentual deve estar entre 1 e 100." };
  }

  const code = normalizeCode(d.code);
  const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, code) });
  if (existing) return { error: "Já existe um cupom com esse código." };

  const value = d.type === "percent" ? Math.round(d.value) : Math.round(d.value * 100);
  const maxUses = d.maxUses ? Math.max(1, Math.round(Number(d.maxUses))) : null;
  const expiresAt = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59-03:00`) : null;
  if (d.expiresAt && Number.isNaN(expiresAt!.getTime())) return { error: "Data de validade inválida." };

  await db.insert(coupons).values({
    code,
    type: d.type,
    value,
    minSubtotalCents: Math.round(d.minSubtotal * 100),
    maxUses,
    expiresAt,
  });

  await logAudit({ action: "coupon.create", entity: "coupon", entityId: code });
  revalidatePath("/admin/cupons");
  return { ok: true };
}

export async function toggleCoupon(id: string, active: boolean) {
  await requireAdmin();
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
  await logAudit({ action: "coupon.toggle", entity: "coupon", entityId: id, detail: { active } });
  revalidatePath("/admin/cupons");
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  await db.delete(coupons).where(eq(coupons.id, id));
  await logAudit({ action: "coupon.delete", entity: "coupon", entityId: id });
  revalidatePath("/admin/cupons");
}
