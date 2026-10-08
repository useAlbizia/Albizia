"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Symbol } from "@/components/logo/Symbol";
import { Wordmark } from "@/components/logo/Wordmark";
import { riseIn, staggerChildren } from "@/lib/motion";

// O slide da marca: a árvore, o nome e a frase, como um dos slides do banner.
//
// Ao contrário das campanhas, que são foto com texto branco por cima, este
// slide usa as cores do tema. Então ele segue o conceito do nome sem esforço:
// claro de dia, escuro de noite, porque o tema do site já muda com o horário
// de quem visita.
export function BrandSlide() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface px-6 text-center text-content">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerChildren(0.18)}
        className="flex flex-col items-center gap-5"
      >
        <motion.div variants={riseIn}>
          <Symbol className="h-28 w-auto sm:h-36" />
        </motion.div>
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
    </div>
  );
}
