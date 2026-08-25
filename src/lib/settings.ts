import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings, legalPages } from "./db/schema";

export type SiteSettings = {
  companyName: string;
  cnpj: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  instagram: string;
  shippingFlatCents: number;
  freeShippingThresholdCents: number;
  lowStockThreshold: number;
};

const DEFAULTS: SiteSettings = {
  companyName: "ALBIZIA",
  cnpj: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  instagram: "",
  shippingFlatCents: 0,
  freeShippingThresholdCents: 0,
  lowStockThreshold: 3,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  if (!row) return DEFAULTS;
  return {
    companyName: row.companyName,
    cnpj: row.cnpj,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    address: row.address,
    instagram: row.instagram,
    shippingFlatCents: row.shippingFlatCents,
    freeShippingThresholdCents: row.freeShippingThresholdCents,
    lowStockThreshold: row.lowStockThreshold,
  };
}

export type LegalPage = { slug: string; title: string; body: string };

export const LEGAL_SLUGS = ["termos", "privacidade", "trocas"] as const;

export async function getLegalPage(slug: string): Promise<LegalPage | undefined> {
  const row = await db.query.legalPages.findFirst({ where: eq(legalPages.slug, slug) });
  if (!row) return undefined;
  return { slug: row.slug, title: row.title, body: row.body };
}

export async function getLegalPages(): Promise<LegalPage[]> {
  const rows = await db.query.legalPages.findMany();
  const order = new Map<string, number>(LEGAL_SLUGS.map((s, i) => [s, i]));
  return rows
    .map((r) => ({ slug: r.slug, title: r.title, body: r.body }))
    .sort((a, b) => (order.get(a.slug) ?? 9) - (order.get(b.slug) ?? 9));
}
