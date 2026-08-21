import type { MetadataRoute } from "next";
import { getAllProductSlugs, getCollections } from "@/lib/products";
import { LEGAL_SLUGS } from "@/lib/settings";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, collections] = await Promise.all([getAllProductSlugs(), getCollections()]);

  const staticRoutes = ["", "/colecoes", "/sobre", ...LEGAL_SLUGS.map((s) => `/${s}`)];

  return [
    ...staticRoutes.map((path) => ({ url: `${BASE}${path}`, changeFrequency: "monthly" as const })),
    ...collections.map((c) => ({
      url: `${BASE}/colecoes/${c.slug}`,
      changeFrequency: "weekly" as const,
    })),
    ...slugs.map((slug) => ({
      url: `${BASE}/produto/${slug}`,
      changeFrequency: "weekly" as const,
    })),
  ];
}
