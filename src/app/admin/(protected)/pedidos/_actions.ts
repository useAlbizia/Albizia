"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";

const VALID_STATUSES = ["pending", "paid", "shipped", "cancelled", "refunded"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status)) return;

  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}
