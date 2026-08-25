"use server";

import { z } from "zod";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";

export type ReviewState = { ok?: boolean; error?: string };

const schema = z.object({
  productId: z.string().uuid(),
  authorName: z.string().min(1, "Informe seu nome.").max(80),
  authorEmail: z.string().email().optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1, "Escolha uma nota.").max(5),
  comment: z.string().max(2000).optional(),
});

// Anyone can submit a review; it's created as "pending" and only appears on the
// storefront after an admin approves it (see /admin/avaliacoes).
export async function submitReview(
  productId: string,
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const parsed = schema.safeParse({
    productId,
    authorName: formData.get("authorName"),
    authorEmail: formData.get("authorEmail") || "",
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;

  await db.insert(reviews).values({
    productId: d.productId,
    authorName: d.authorName,
    authorEmail: d.authorEmail || null,
    rating: d.rating,
    comment: d.comment ?? "",
    status: "pending",
  });

  return { ok: true };
}
