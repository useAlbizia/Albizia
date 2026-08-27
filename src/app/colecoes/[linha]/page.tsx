import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollections, getCollection, getProductsByLine } from "@/lib/products";
import { ProductCover } from "@/components/ProductImage";

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ linha: c.slug }));
}

export async function generateMetadata(props: PageProps<"/colecoes/[linha]">) {
  const { linha } = await props.params;
  const collection = await getCollection(linha);
  return { title: collection ? `${collection.name} · ALBIZIA` : "ALBIZIA" };
}

export default async function ColecaoPage(props: PageProps<"/colecoes/[linha]">) {
  const { linha } = await props.params;
  const collection = await getCollection(linha);
  if (!collection) notFound();

  const products = await getProductsByLine(collection.slug);

  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.25em] text-content/40">
          {collection.fabric}
        </p>
        <h1 className="mt-4 text-2xl uppercase tracking-[0.15em] sm:text-3xl">
          {collection.name}
        </h1>
        <p className="mt-3 text-sm uppercase tracking-[0.2em] text-content/60">
          {collection.tagline}
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-content/60">
          {collection.description}
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-28 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link key={product.slug} href={`/produto/${product.slug}`} className="group block">
            <ProductCover
              name={product.name}
              images={product.images}
              role="studio"
              className="aspect-[4/5] w-full"
            />
            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-sm uppercase tracking-[0.1em] text-content/80 group-hover:text-content">
                {product.name}
              </h2>
            </div>
            <p className="mt-1 text-sm text-content/50">
              {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </Link>
        ))}

        {products.length === 0 && (
          <p className="col-span-full text-center text-sm text-content/50">
            Novas peças desta linha chegam em breve.
          </p>
        )}
      </div>
    </section>
  );
}
