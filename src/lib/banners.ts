import { asc } from "drizzle-orm";
import { db } from "./db/client";
import { banners } from "./db/schema";

export type Banner = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  align: "left" | "center" | "right";
};

export async function getActiveBanners(): Promise<Banner[]> {
  const rows = await db.query.banners.findMany({
    where: (b, { eq }) => eq(b.active, true),
    orderBy: [asc(banners.sortOrder)],
  });
  return rows.map((b) => ({
    id: b.id,
    imageUrl: b.imageUrl,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    align: (b.align as "left" | "center" | "right") ?? "center",
  }));
}
