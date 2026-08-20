"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Symbol } from "@/components/logo/Symbol";
import { Wordmark } from "@/components/logo/Wordmark";
import type { CollectionInfo } from "@/lib/products";
import { fadeSlow, materialize, riseIn, staggerChildren } from "@/lib/motion";

export function HomeHero({ collections }: { collections: CollectionInfo[] }) {
  return (
    <>
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerChildren(0.25)}
          className="flex flex-col items-center gap-8"
        >
          <motion.div variants={materialize}>
            <Symbol className="h-14 w-14" />
          </motion.div>

          <motion.div variants={materialize}>
            <Wordmark className="h-8 w-auto sm:h-10" />
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

        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 0.05, scale: 1 }}
          transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <Symbol className="h-[70vh] w-[70vh]" />
        </motion.div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-15%" }}
        variants={fadeSlow}
        className="mx-auto max-w-2xl px-6 py-28 text-center"
      >
        <p className="text-lg leading-relaxed text-content/80 sm:text-xl">
          A Albizia fecha as folhas ao anoitecer para se preservar. A verdadeira
          força não está em estar sempre alerta — está em saber o momento
          exato de se recolher.
        </p>
      </motion.section>

      <section className="mx-auto max-w-6xl px-6 pb-32">
        <div className="grid grid-cols-1 gap-px overflow-hidden bg-content/10 sm:grid-cols-2">
          {collections.map((collection, i) => (
            <motion.div
              key={collection.slug}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10%" }}
              variants={riseIn}
              transition={{ delay: (i % 2) * 0.1 }}
            >
              <Link
                href={`/colecoes/${collection.slug}`}
                className="group flex h-full flex-col justify-between gap-10 bg-surface px-8 py-14 transition-colors hover:bg-surface-soft"
              >
                <div>
                  <h2 className="text-xl uppercase tracking-[0.15em]">{collection.name}</h2>
                  <p className="mt-2 text-sm text-content/60">{collection.tagline}</p>
                </div>
                <span className="text-[12px] uppercase tracking-[0.2em] text-content/50 transition-colors group-hover:text-content">
                  Explorar →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
