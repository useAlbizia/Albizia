"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Reference measurements (cm). Founders can fine-tune later; shown as a guide.
const CAMISETA = {
  cols: ["Tamanho", "Largura (peito)", "Comprimento", "Ombro"],
  rows: [
    ["P", "50 cm", "70 cm", "43 cm"],
    ["M", "53 cm", "72 cm", "45 cm"],
    ["G", "56 cm", "74 cm", "47 cm"],
    ["GG", "59 cm", "76 cm", "49 cm"],
  ],
};

const MODA_PRAIA = {
  cols: ["Tamanho", "Cintura (elástico)", "Comprimento"],
  rows: [
    ["P", "38–44 cm", "44 cm"],
    ["M", "42–48 cm", "46 cm"],
    ["G", "46–52 cm", "48 cm"],
    ["GG", "50–56 cm", "50 cm"],
  ],
};

export function SizeGuide({ category }: { category: string }) {
  const [open, setOpen] = useState(false);
  const table = category === "moda-praia" ? MODA_PRAIA : CAMISETA;

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
                  {table.rows.map((r) => (
                    <tr key={r[0]}>
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
                Medidas da peça (não do corpo), com variação de ±2 cm. Na dúvida entre dois
                tamanhos, escolha o maior para um caimento mais solto.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
