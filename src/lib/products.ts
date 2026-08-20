import { asc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { collections as collectionsTable, products as productsTable } from "./db/schema";

export type ProductLine = "essential" | "signature" | "studio" | "moda-praia";

export type ProductVariant = { id: string; size: string; stock: number };
export type ProductImage = { id: string; url: string; role: string | null; sortOrder: number };

export type Product = {
  slug: string;
  name: string;
  category: string;
  line: ProductLine;
  /** reais, e.g. 219 for R$219,00 — converted from price_cents for display */
  price: number;
  fabric: string;
  description: string;
  variants: ProductVariant[];
  images: ProductImage[];
};

export type CollectionInfo = {
  slug: ProductLine;
  name: string;
  tagline: string;
  description: string;
  fabric: string;
};

function toProduct(row: {
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  fabric: string;
  description: string;
  collection: { slug: string };
  variants: { id: string; size: string; stock: number }[];
  images: { id: string; url: string; role: string | null; sortOrder: number }[];
}): Product {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    line: row.collection.slug as ProductLine,
    price: row.priceCents / 100,
    fabric: row.fabric,
    description: row.description,
    variants: row.variants,
    images: [...row.images].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function getCollections(): Promise<CollectionInfo[]> {
  const rows = await db.query.collections.findMany({
    orderBy: asc(collectionsTable.sortOrder),
  });
  return rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    fabric: c.fabric,
  }));
}

export async function getCollection(slug: string): Promise<CollectionInfo | undefined> {
  const row = await db.query.collections.findFirst({
    where: eq(collectionsTable.slug, slug as ProductLine),
  });
  if (!row) return undefined;
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    fabric: row.fabric,
  };
}

export async function getProductsByLine(line: ProductLine): Promise<Product[]> {
  const collection = await db.query.collections.findFirst({
    where: eq(collectionsTable.slug, line),
  });
  if (!collection) return [];

  const rows = await db.query.products.findMany({
    where: (products, { eq: eqOp, and }) =>
      and(eqOp(products.active, true), eqOp(products.collectionId, collection.id)),
    with: { collection: true, variants: true, images: true },
  });
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const row = await db.query.products.findFirst({
    where: eq(productsTable.slug, slug),
    with: { collection: true, variants: true, images: true },
  });
  if (!row) return undefined;
  return toProduct(row);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db.query.products.findMany({
    where: eq(productsTable.active, true),
    columns: { slug: true },
  });
  return rows.map((r) => r.slug);
}
