import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { reviews } from "./db/schema";

export type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: Date;
};

export type ReviewSummary = {
  average: number; // 0 when no reviews
  count: number;
  items: ProductReview[];
};

// Approved reviews for a product, plus the average rating — the only review
// data the storefront ever shows (pending/rejected stay hidden).
export async function getProductReviews(productId: string): Promise<ReviewSummary> {
  const rows = await db.query.reviews.findMany({
    where: and(eq(reviews.productId, productId), eq(reviews.status, "approved")),
    orderBy: [desc(reviews.createdAt)],
  });

  const count = rows.length;
  const average = count ? rows.reduce((s, r) => s + r.rating, 0) / count : 0;

  return {
    average,
    count,
    items: rows.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
  };
}
