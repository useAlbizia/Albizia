"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Banner } from "@/lib/banners";

const alignMap: Record<string, string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

export function HeroBanners({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % count), 6000);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const b = banners[Math.min(i, count - 1)];

  return (
    <section className="relative h-[68vh] min-h-[420px] w-full overflow-hidden bg-surface-soft">
      <AnimatePresence mode="wait">
        <motion.div
          key={b.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image src={b.imageUrl} alt={b.title || "ALBIZIA"} fill priority sizes="100vw" className="object-cover" />
          {(b.title || b.subtitle || b.ctaLabel) && (
            <div className={`absolute inset-0 flex flex-col justify-center gap-4 bg-black/25 px-8 sm:px-16 ${alignMap[b.align] ?? alignMap.center}`}>
              {b.subtitle && (
                <span className="text-[11px] uppercase tracking-[0.3em] text-white/80">{b.subtitle}</span>
              )}
              {b.title && (
                <h2 className="max-w-xl text-3xl font-light uppercase tracking-[0.1em] text-white sm:text-5xl">
                  {b.title}
                </h2>
              )}
              {b.ctaLabel && b.ctaHref && (
                <Link
                  href={b.ctaHref}
                  className="mt-2 inline-block border border-white px-8 py-3 text-[13px] uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
                >
                  {b.ctaLabel}
                </Link>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {banners.map((bn, idx) => (
              <button
                key={bn.id}
                onClick={() => setI(idx)}
                aria-label={`Banner ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
          <button
            onClick={() => setI((v) => (v - 1 + count) % count)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-white/70 transition-colors hover:text-white"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            onClick={() => setI((v) => (v + 1) % count)}
            aria-label="Próximo"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/70 transition-colors hover:text-white"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </>
      )}
    </section>
  );
}
