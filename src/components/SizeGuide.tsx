"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { GUIA_CAMISETA as CAMISETA, GUIA_MODA_PRAIA as MODA_PRAIA } from "@/lib/guia-padrao";

export type TabelaGuia = { cols: string[]; rows: string[][]; obs?: string };

// `tabela` vem do guia escolhido no painel (Guias de tamanho). Sem guia, usa a
// tabela padrão abaixo.
export function SizeGuide({ category, tabela }: { category: string; tabela?: TabelaGuia | null }) {
  const [open, setOpen] = useState(false);
  const table = tabela ?? (category === "moda-praia" ? MODA_PRAIA : CAMISETA);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] uppercase tracking-[0.15em] text-content/50 underline underline-offset-4 transition-colors hover:text-content"
      >
        Guia de tamanhos
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
              role="dialog"
              aria-label="Guia de tamanhos"
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-content/10 bg-surface p-8 text-content shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-[0.25em] text-content/60">
                  Guia de tamanhos
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="text-content/50 transition-colors hover:text-content"
                >
                  ✕
                </button>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-content/15 text-[11px] uppercase tracking-[0.1em] text-content/50">
                    {table.cols.map((c) => (
                      <th key={c} className="py-2 pr-4 font-normal">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-content/10">
                  {table.rows.map((r, idx) => (
                    <tr key={`${r[0]}-${idx}`}>
                      {r.map((cell, i) => (
                        <td key={i} className={`py-2.5 pr-4 ${i === 0 ? "" : "text-content/70"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-6 text-[12px] leading-relaxed text-content/50">
                {tabela?.obs ||
                  "Medidas da peça (não do corpo), com variação de ±2 cm. Na dúvida entre dois tamanhos, escolha o maior para um caimento mais solto."}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
