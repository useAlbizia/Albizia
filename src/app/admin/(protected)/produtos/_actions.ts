"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { products, productVariants, productImages, collections } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { generateProductDescription, type AiText } from "@/lib/ai";

// Generates a brand-voice product description with Claude from the current form
// values — the admin can regenerate before saving.
export async function aiGenerateDescription(input: {
  name: string;
  category: string;
  collectionSlug: string;
  fabric: string;
}): Promise<AiText> {
  await requireAdmin();
  if (!input.name.trim()) return { error: "Preencha o nome do produto primeiro." };
  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, input.collectionSlug as "essential"),
  });
  return generateProductDescription({
    name: input.name,
    category: input.category || "camiseta",
    collection: collection?.name ?? input.collectionSlug,
    fabric: input.fabric,
  });
}

const SIZES_BY_CATEGORY: Record<string, string[]> = {
  camiseta: ["P", "M", "G", "GG"],
  "moda-praia": ["P", "M", "G", "GG"],
};

const productSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  slug: z
    .string()
    .min(1, "Slug obrigatório")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  collectionSlug: z.string().min(1),
  category: z.enum(["camiseta", "moda-praia"]),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  fabric: z.string().min(1, "Tecido obrigatório"),
  description: z.string().min(1, "Descrição obrigatória"),
  sizesText: z.string().optional(),
});

export type ProductFormState = { error?: string; productId?: string };

async function resolveSizes(category: string, sizesText?: string) {
  if (sizesText?.trim()) {
    return sizesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return SIZES_BY_CATEGORY[category] ?? ["Único"];
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    collectionSlug: formData.get("collectionSlug"),
    category: formData.get("category"),
    price: formData.get("price"),
    fabric: formData.get("fabric"),
    description: formData.get("description"),
    sizesText: formData.get("sizesText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, data.collectionSlug as "essential"),
  });
  if (!collection) {
    return { error: "Coleção inválida." };
  }

  const existing = await db.query.products.findFirst({ where: eq(products.slug, data.slug) });
  if (existing) {
    return { error: "Já existe um produto com esse slug." };
  }

  const [created] = await db
    .insert(products)
    .values({
      name: data.name,
      slug: data.slug,
      collectionId: collection.id,
      category: data.category,
      priceCents: Math.round(data.price * 100),
      fabric: data.fabric,
      description: data.description,
    })
    .returning();

  const sizes = await resolveSizes(data.category, data.sizesText);
  await db
    .insert(productVariants)
    .values(sizes.map((size) => ({ productId: created.id, size, stock: 0 })));

  await logAudit({ action: "product.create", entity: "product", entityId: created.id, detail: { name: data.name } });
  revalidatePath("/colecoes");
  revalidatePath(`/colecoes/${data.collectionSlug}`);
  revalidatePath("/admin/produtos");

  return { productId: created.id };
}

export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = productSchema
    .omit({ sizesText: true })
    .safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      collectionSlug: formData.get("collectionSlug"),
      category: formData.get("category"),
      price: formData.get("price"),
      fabric: formData.get("fabric"),
      description: formData.get("description"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const collection = await db.query.collections.findFirst({
    where: eq(collections.slug, data.collectionSlug as "essential"),
  });
  if (!collection) {
    return { error: "Coleção inválida." };
  }

  const current = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!current) {
    return { error: "Produto não encontrado." };
  }

  await db
    .update(products)
    .set({
      name: data.name,
      slug: data.slug,
      collectionId: collection.id,
      category: data.category,
      priceCents: Math.round(data.price * 100),
      fabric: data.fabric,
      description: data.description,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await logAudit({ action: "product.update", entity: "product", entityId: productId, detail: { name: data.name } });
  revalidatePath("/colecoes");
  revalidatePath(`/colecoes/${current.slug}`);
  revalidatePath(`/colecoes/${data.collectionSlug}`);
  revalidatePath(`/produto/${current.slug}`);
  revalidatePath(`/produto/${data.slug}`);
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${productId}`);

  return { productId };
}

export async function toggleProductActive(productId: string, active: boolean) {
  await requireAdmin();
  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  await db
    .update(products)
    .set({ active, updatedAt: new Date() })
    .where(eq(products.id, productId));
  revalidatePath("/admin/produtos");
  if (product) {
    revalidatePath(`/produto/${product.slug}`);
  }
}

export async function updateVariantStock(variantId: string, stock: number, productId: string) {
  await requireAdmin();
  if (!Number.isFinite(stock) || stock < 0) return;
  await db
    .update(productVariants)
    .set({ stock: Math.round(stock), updatedAt: new Date() })
    .where(eq(productVariants.id, variantId));

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  revalidatePath(`/admin/produtos/${productId}`);
  if (product) revalidatePath(`/produto/${product.slug}`);
}

export async function addProductImage(productId: string, url: string, role: string) {
  await requireAdmin();
  await db.insert(productImages).values({ productId, url, role, sortOrder: 0 });

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  revalidatePath(`/admin/produtos/${productId}`);
  if (product) {
    revalidatePath(`/produto/${product.slug}`);
    revalidatePath(`/colecoes/${product.category}`);
  }
}

export async function removeProductImage(imageId: string, productId: string) {
  await requireAdmin();
  await db.delete(productImages).where(eq(productImages.id, imageId));

  const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
  revalidatePath(`/admin/produtos/${productId}`);
  if (product) revalidatePath(`/produto/${product.slug}`);
}
