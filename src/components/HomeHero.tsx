"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ProductCover } from "@/components/ProductImage";
import { CollectionRow } from "@/components/CollectionRow";
import type { CollectionInfo, Product } from "@/lib/products";
import { fadeSlow, riseIn } from "@/lib/motion";

// O topo da home (árvore, nome, frase) virou o slide da marca dentro do
// banner (ver BrandSlide e HeroBanners), configurável no painel. Daqui para
// baixo são as vitrines.
export function HomeHero({
  collections,
  featured,
}: {
  collections: CollectionInfo[];
  featured: Product[];
}) {
  return (
    <>
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
          <h2 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
            Peças
          </h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {featured.map((product, i) => (
              <motion.div
                key={product.slug}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-8%" }}
                variants={riseIn}
                transition={{ delay: (i % 3) * 0.08 }}
              >
                <Link href={`/produto/${product.slug}`} className="group block">
                  <ProductCover
                    name={product.name}
                    images={product.images}
                    role="studio"
                    className="aspect-[4/5] w-full"
                  />
                  <h3 className="mt-3 text-[13px] uppercase tracking-[0.1em] text-content/80 group-hover:text-content">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-sm text-content/50">
                    {product.price.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-15%" }}
        variants={fadeSlow}
        className="mx-auto max-w-2xl px-6 py-24 text-center"
      >
        <p className="text-lg leading-relaxed text-content/80 sm:text-xl">
          A Albizia fecha as folhas ao anoitecer para se preservar. A verdadeira
          força não está em estar sempre alerta, e sim em saber o momento
          exato de se recolher.
        </p>
      </motion.section>

      <section className="pb-24">
        <h2 className="mb-4 text-center text-sm uppercase tracking-[0.3em] text-content/60">
          Coleções
        </h2>
        <div className="flex flex-col">
          {collections.map((collection, i) => (
            <CollectionRow key={collection.slug} collection={collection} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}
