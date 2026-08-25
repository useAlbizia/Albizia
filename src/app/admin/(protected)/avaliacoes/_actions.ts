"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { reviews, products } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

async function revalidateProduct(productId: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { slug: true },
  });
  if (product) revalidatePath(`/produto/${product.slug}`);
}

async function setStatus(id: string, status: "approved" | "rejected") {
  await requireAdmin();
  const [row] = await db
    .update(reviews)
    .set({ status })
    .where(eq(reviews.id, id))
    .returning({ productId: reviews.productId });
  if (row) await revalidateProduct(row.productId);
  await logAudit({ action: `review.${status}`, entity: "review", entityId: id });
  revalidatePath("/admin/avaliacoes");
}

export async function approveReview(id: string) {
  await setStatus(id, "approved");
}

export async function rejectReview(id: string) {
  await setStatus(id, "rejected");
}

export async function deleteReview(id: string) {
  await requireAdmin();
  const [row] = await db
    .delete(reviews)
    .where(eq(reviews.id, id))
    .returning({ productId: reviews.productId });
  if (row) await revalidateProduct(row.productId);
  await logAudit({ action: "review.delete", entity: "review", entityId: id });
  revalidatePath("/admin/avaliacoes");
}
