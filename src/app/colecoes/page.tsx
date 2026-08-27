import { getCollections } from "@/lib/products";
import { CollectionRow } from "@/components/CollectionRow";

export const metadata = { title: "Coleções · ALBIZIA" };

export default async function ColecoesPage() {
  const collections = await getCollections();

  return (
    <section className="pb-24">
      <h1 className="py-16 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Coleções
      </h1>
      <div className="flex flex-col">
        {collections.map((collection, i) => (
          <CollectionRow key={collection.slug} collection={collection} index={i} />
        ))}
      </div>
    </section>
  );
}
