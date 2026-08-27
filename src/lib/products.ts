import { asc, eq, or, ilike } from "drizzle-orm";
import { db } from "./db/client";
import { collections as collectionsTable, products as productsTable } from "./db/schema";

export type ProductLine = "essential" | "signature" | "studio" | "moda-praia";

export type ProductVariant = { id: string; size: string; stock: number };
export type ProductImage = { id: string; url: string; role: string | null; sortOrder: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  line: ProductLine;
  /** reais, e.g. 219 for R$219,00 — converted from price_cents for display */
  price: number;
  fabric: string;
  description: string;
  colorGroup: string | null;
  colorName: string;
  colorHex: string;
  variants: ProductVariant[];
  images: ProductImage[];
};

/** One color option within a color group (used for the swatch selector). */
export type ColorOption = {
  slug: string;
  colorName: string;
  colorHex: string;
};

export type CollectionInfo = {
  slug: ProductLine;
  name: string;
  tagline: string;
  description: string;
  fabric: string;
  /** A representative product photo used as the collection's editorial cover */
  coverUrl?: string;
};

function toProduct(row: {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCents: number;
  fabric: string;
  description: string;
  colorGroup: string | null;
  colorName: string;
  colorHex: string;
  collection: { slug: string };
  variants: { id: string; size: string; stock: number }[];
  images: { id: string; url: string; role: string | null; sortOrder: number }[];
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    line: row.collection.slug as ProductLine,
    price: row.priceCents / 100,
    fabric: row.fabric,
    description: row.description,
    colorGroup: row.colorGroup,
    colorName: row.colorName,
    colorHex: row.colorHex,
    variants: row.variants,
    images: [...row.images].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

// Other active products in the same color group — the color options shown as
// swatches on a product page. Returns [] when the product has no group.
export async function getColorSiblings(colorGroup: string | null): Promise<ColorOption[]> {
  if (!colorGroup) return [];
  const rows = await db.query.products.findMany({
    where: (p, { eq: eqOp, and }) =>
      and(eqOp(p.active, true), eqOp(p.colorGroup, colorGroup)),
    columns: { slug: true, colorName: true, colorHex: true, priceCents: true },
    orderBy: (p, { asc: ascOp }) => ascOp(p.priceCents),
  });
  return rows.map((r) => ({ slug: r.slug, colorName: r.colorName, colorHex: r.colorHex }));
}

export async function getCollections(): Promise<CollectionInfo[]> {
  const rows = await db.query.collections.findMany({
    orderBy: asc(collectionsTable.sortOrder),
    with: {
      products: {
        where: (products, { eq: eqOp }) => eqOp(products.active, true),
        with: { images: true },
      },
    },
  });

  return rows.map((c) => {
    // Pick a representative photo: prefer a studio shot, else any image, from
    // the first product in the collection that has one.
    let coverUrl: string | undefined;
    for (const p of c.products) {
      if (!p.images.length) continue;
      const studio = p.images.find((img) => img.role === "studio");
      coverUrl = (studio ?? p.images[0]).url;
      break;
    }
    return {
      slug: c.slug,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      fabric: c.fabric,
      coverUrl,
    };
  });
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
  // Never show a product without photos on the storefront.
  return rows.map(toProduct).filter((p) => p.images.length > 0);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const row = await db.query.products.findFirst({
    where: eq(productsTable.slug, slug),
    with: { collection: true, variants: true, images: true },
  });
  if (!row) return undefined;
  return toProduct(row);
}

export type ProductFilters = {
  q?: string;
  line?: string;
  category?: string;
  sort?: "recentes" | "menor-preco" | "maior-preco";
};

// Catalog search + filter for the /produtos page. Matches name/description,
// optionally narrows by collection line and category, and sorts.
export async function getFilteredProducts(filters: ProductFilters): Promise<Product[]> {
  let collectionId: string | undefined;
  if (filters.line) {
    const c = await db.query.collections.findFirst({
      where: eq(collectionsTable.slug, filters.line as ProductLine),
    });
    collectionId = c?.id;
    if (!collectionId) return [];
  }

  const rows = await db.query.products.findMany({
    where: (p, { eq: eqOp, and: andOp }) => {
      const conds = [eqOp(p.active, true)];
      if (collectionId) conds.push(eqOp(p.collectionId, collectionId));
      if (filters.category) conds.push(eqOp(p.category, filters.category));
      if (filters.q?.trim()) {
        const term = `%${filters.q.trim()}%`;
        conds.push(or(ilike(p.name, term), ilike(p.description, term))!);
      }
      return andOp(...conds);
    },
    with: { collection: true, variants: true, images: true },
    orderBy: (p, { asc: ascOp, desc }) => {
      if (filters.sort === "menor-preco") return ascOp(p.priceCents);
      if (filters.sort === "maior-preco") return desc(p.priceCents);
      return desc(p.createdAt);
    },
  });
  return rows.map(toProduct).filter((p) => p.images.length > 0);
}

// Products for a list of slugs, returned IN THAT ORDER (used by AI search to
// preserve the relevance ranking). Only active products with photos.
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const rows = await db.query.products.findMany({
    where: (p, { and, eq, inArray }) => and(eq(p.active, true), inArray(p.slug, slugs)),
    with: { collection: true, variants: true, images: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, toProduct(r)]));
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is Product => !!p && p.images.length > 0);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const rows = await db.query.products.findMany({
    where: eq(productsTable.active, true),
    columns: { slug: true },
  });
  return rows.map((r) => r.slug);
}

// Products that have at least one photo — used to showcase real pieces on
// the home page. Falls back to any active product if none have photos yet.
export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const rows = await db.query.products.findMany({
    where: eq(productsTable.active, true),
    with: { collection: true, variants: true, images: true },
  });
  const withPhotos = rows.filter((r) => r.images.length > 0).map(toProduct);
  return withPhotos.slice(0, limit);
}
