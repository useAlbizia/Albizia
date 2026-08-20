import Link from "next/link";
import { getCollections } from "@/lib/products";

export const metadata = { title: "Coleções — ALBIZIA" };

export default async function ColecoesPage() {
  const collections = await getCollections();

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h1 className="mb-16 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Coleções
      </h1>
      <div className="grid grid-cols-1 gap-px overflow-hidden bg-content/10 sm:grid-cols-2">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={`/colecoes/${collection.slug}`}
            className="group flex h-full flex-col justify-between gap-10 bg-surface px-8 py-16 transition-colors hover:bg-surface-soft"
          >
            <div>
              <h2 className="text-xl uppercase tracking-[0.15em]">{collection.name}</h2>
              <p className="mt-2 text-sm text-content/60">{collection.tagline}</p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-content/50">
                {collection.description}
              </p>
            </div>
            <span className="text-[12px] uppercase tracking-[0.2em] text-content/50 transition-colors group-hover:text-content">
              Explorar →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
