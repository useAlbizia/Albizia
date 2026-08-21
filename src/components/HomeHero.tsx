"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/logo/Wordmark";
import { AnimatedSymbol } from "@/components/AnimatedSymbol";
import { ProductCover } from "@/components/ProductImage";
import { CollectionRow } from "@/components/CollectionRow";
import type { CollectionInfo, Product } from "@/lib/products";
import { fadeSlow, riseIn, staggerChildren } from "@/lib/motion";

export function HomeHero({
  collections,
  featured,
}: {
  collections: CollectionInfo[];
  featured: Product[];
}) {
  return (
    <>
      {/* Hero — kept intentionally shorter than full height so the first
          pieces peek in below the fold, inviting the scroll. */}
      <section className="relative flex min-h-[64vh] flex-col items-center justify-center overflow-hidden px-6 pt-10 pb-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerChildren(0.3)}
          className="flex flex-col items-center gap-5"
        >
          <AnimatedSymbol className="h-32 w-auto sm:h-40" />

          <motion.div variants={riseIn}>
            <Wordmark className="h-7 w-auto text-content sm:h-9" />
          </motion.div>

          <motion.p
            variants={riseIn}
            className="max-w-md text-sm uppercase tracking-[0.3em] text-content/60"
          >
            Silence becomes style.
          </motion.p>

          <motion.div variants={riseIn}>
            <Link
              href="/colecoes"
              className="inline-block border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] text-content transition-colors hover:bg-content hover:text-surface"
            >
              Ver coleções
            </Link>
          </motion.div>
        </motion.div>
      </section>

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
          força não está em estar sempre alerta — está em saber o momento
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
