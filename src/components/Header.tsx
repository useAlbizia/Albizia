"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "./logo/Wordmark";
import { converge } from "@/lib/motion";
import { useCart } from "@/lib/cart-context";
import type { MenuEntry } from "@/lib/menu";

export function Header({ menu }: { menu: MenuEntry[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { totalCount, openCart } = useCart();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  const hasPanel = (m: MenuEntry) => m.columns.length > 0 || !!m.featured;
  const active = menu.find((m) => m.id === openId && hasPanel(m)) ?? null;

  const topLink =
    "text-[13px] uppercase tracking-[0.18em] text-content/70 transition-colors hover:text-content";

  return (
    <header
      className="sticky top-0 z-40 border-b border-content/10 bg-surface/95 backdrop-blur"
      onMouseLeave={() => setOpenId(null)}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" aria-label="ALBIZIA" className="text-content" onClick={() => setMobileOpen(false)}>
          <Wordmark className="h-4 w-auto sm:h-5" />
        </Link>

        <nav className="hidden gap-8 md:flex">
          {menu.map((m) =>
            m.href ? (
              <Link
                key={m.id}
                href={m.href}
                className={topLink}
                onMouseEnter={() => setOpenId(hasPanel(m) ? m.id : null)}
              >
                {m.label}
              </Link>
            ) : (
              <button
                key={m.id}
                type="button"
                className={topLink}
                onMouseEnter={() => setOpenId(hasPanel(m) ? m.id : null)}
              >
                {m.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-5">
          <Link href="/produtos" aria-label="Buscar" className="text-content/70 transition-colors hover:text-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/conta" aria-label="Minha conta" className="text-content/70 transition-colors hover:text-content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={openCart}
            aria-label={`Sacola${totalCount > 0 ? ` (${totalCount})` : ""}`}
            className="relative text-content/70 transition-colors hover:text-content"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-content px-1 text-[10px] font-medium text-surface">
                {totalCount}
              </span>
            )}
          </button>
          <button
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-6 flex-col items-center justify-center gap-1.5 md:hidden"
          >
            <span className={`h-px w-5 bg-content transition-transform ${mobileOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`h-px w-5 bg-content transition-transform ${mobileOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Desktop mega-panel */}
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => setOpenId(active.id)}
            className="absolute inset-x-0 top-full hidden border-t border-content/10 bg-surface shadow-lg md:block"
          >
            <div className="mx-auto flex max-w-6xl gap-12 px-6 py-9">
              <div className="flex flex-1 gap-14">
                {active.columns.map((col) => (
                  <div key={col.title || "geral"}>
                    {col.title && (
                      <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/40">
                        {col.title}
                      </p>
                    )}
                    <div className="flex flex-col gap-2.5">
                      {col.links.map((l) => (
                        <Link
                          key={`${l.href}-${l.label}`}
                          href={l.href}
                          onClick={() => setOpenId(null)}
                          className="text-sm text-content/70 transition-colors hover:text-content"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {active.featured && (
                <Link
                  href={active.featured.href}
                  onClick={() => setOpenId(null)}
                  className="group relative hidden aspect-[3/4] w-64 shrink-0 overflow-hidden md:block"
                >
                  <Image src={active.featured.img} alt={active.featured.label} fill sizes="256px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block text-[13px] uppercase tracking-[0.18em] text-white">
                      {active.featured.label}
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-white/85">
                      Explorar
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            variants={converge}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="border-t border-content/10 px-6 pb-6 pt-2 md:hidden"
          >
            {menu.map((m) =>
              m.columns.length > 0 ? (
                <div key={m.id} className="border-b border-content/5">
                  <button
                    type="button"
                    onClick={() => setExpanded((e) => (e === m.id ? null : m.id))}
                    className="flex w-full items-center justify-between py-3 text-sm uppercase tracking-[0.18em] text-content/80"
                  >
                    {m.label}
                    <span className="text-content/40">{expanded === m.id ? "−" : "+"}</span>
                  </button>
                  {expanded === m.id && (
                    <div className="flex flex-col gap-2 pb-4 pl-3">
                      {m.columns.flatMap((c) => c.links).map((l) => (
                        <Link
                          key={`${l.href}-${l.label}`}
                          href={l.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-[13px] text-content/60"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={m.id}
                  href={m.href ?? "/"}
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-content/5 py-3 text-sm uppercase tracking-[0.18em] text-content/80"
                >
                  {m.label}
                </Link>
              )
            )}
            <Link href="/conta" onClick={() => setMobileOpen(false)} className="block py-3 text-sm uppercase tracking-[0.18em] text-content/80">
              Conta
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
