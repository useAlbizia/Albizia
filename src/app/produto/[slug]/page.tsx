import { notFound } from "next/navigation";
import { getAllProductSlugs, getProductBySlug } from "@/lib/products";
import { ProductDetail } from "@/components/ProductDetail";

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.name} — ALBIZIA` : "ALBIZIA" };
}

export default async function ProdutoPage(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
