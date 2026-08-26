"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { menuItems, menuLinks } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

export type MenuState = { ok?: boolean; error?: string };

function refresh() {
  revalidatePath("/", "layout"); // the header shows on every page
  revalidatePath("/admin/menu");
}

const itemSchema = z.object({
  label: z.string().min(1, "Rótulo obrigatório").max(40),
  href: z.string().max(200).optional(),
});

export async function createMenuItem(_prev: MenuState, formData: FormData): Promise<MenuState> {
  await requireAdmin();
  const parsed = itemSchema.safeParse({
    label: formData.get("label"),
    href: formData.get("href") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${menuItems.sortOrder}), -1)::int` })
    .from(menuItems);
  await db.insert(menuItems).values({
    label: parsed.data.label,
    href: parsed.data.href ?? null,
    sortOrder: (max ?? -1) + 1,
  });
  await logAudit({ action: "menu.item_create", entity: "menu_item", detail: { label: parsed.data.label } });
  refresh();
  return { ok: true };
}

export async function updateMenuItem(id: string, _prev: MenuState, formData: FormData): Promise<MenuState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Rótulo obrigatório." };

  await db
    .update(menuItems)
    .set({
      label,
      href: (formData.get("href") as string)?.trim() || null,
      sortOrder: Math.round(Number(formData.get("sortOrder") ?? 0)) || 0,
      featuredImageUrl: (formData.get("featuredImageUrl") as string)?.trim() || null,
      featuredHref: (formData.get("featuredHref") as string)?.trim() || null,
      featuredLabel: (formData.get("featuredLabel") as string)?.trim() || null,
    })
    .where(eq(menuItems.id, id));
  await logAudit({ action: "menu.item_update", entity: "menu_item", entityId: id });
  refresh();
  return { ok: true };
}

export async function toggleMenuItem(id: string, active: boolean) {
  await requireAdmin();
  await db.update(menuItems).set({ active }).where(eq(menuItems.id, id));
  await logAudit({ action: "menu.item_toggle", entity: "menu_item", entityId: id, detail: { active } });
  refresh();
}

export async function deleteMenuItem(id: string) {
  await requireAdmin();
  await db.delete(menuItems).where(eq(menuItems.id, id));
  await logAudit({ action: "menu.item_delete", entity: "menu_item", entityId: id });
  refresh();
}

export async function addMenuLink(menuItemId: string, _prev: MenuState, formData: FormData): Promise<MenuState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  if (!label || !href) return { error: "Preencha rótulo e link." };

  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${menuLinks.sortOrder}), -1)::int` })
    .from(menuLinks)
    .where(eq(menuLinks.menuItemId, menuItemId));
  await db.insert(menuLinks).values({
    menuItemId,
    columnTitle: String(formData.get("columnTitle") ?? "").trim(),
    label,
    href,
    sortOrder: (max ?? -1) + 1,
  });
  refresh();
  return { ok: true };
}

export async function deleteMenuLink(id: string) {
  await requireAdmin();
  await db.delete(menuLinks).where(eq(menuLinks.id, id));
  refresh();
}
