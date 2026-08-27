"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "./logo/Wordmark";
import { useCart } from "@/lib/cart-context";
import type { MenuEntry } from "@/lib/menu";

const Arrow = ({ className = "" }: { className?: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Header({ menu }: { menu: MenuEntry[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { totalCount, openCart } = useCart();
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (pathname?.startsWith("/admin")) return null;

  const hasPanel = (m: MenuEntry) => m.columns.length > 0 || !!m.featured;
  const active = menu.find((m) => m.id === openId && hasPanel(m)) ?? null;

  const topLink =
    "text-[13px] uppercase tracking-[0.18em] text-content/70 transition-colors hover:text-content";

  return (
    <>
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
            <Link href="/conta" aria-label="Minha conta" className="hidden text-content/70 transition-colors hover:text-content sm:block">
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

        {/* Desktop mega-panel — absolute inside header, no portal needed */}
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
                <div className="flex flex-1 flex-col">
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
                  {active.href && (
                    <Link
                      href={active.href}
                      onClick={() => setOpenId(null)}
                      className="mt-8 inline-flex items-center gap-1.5 self-start text-[11px] uppercase tracking-[0.18em] text-content/50 transition-colors hover:text-content"
                    >
                      Ver tudo em {active.label}
                      <Arrow />
                    </Link>
                  )}
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
                        <Arrow />
                      </span>
                    </div>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer — portal'd to body to escape the header's backdrop-filter stacking context */}
      {mounted && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
              />
              <motion.nav
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                aria-label="Menu mobile"
                className="fixed inset-y-0 right-0 z-50 flex w-[86%] max-w-sm flex-col bg-surface shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-content/10 px-6 py-5">
                  <Wordmark className="h-4 w-auto" />
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setMobileOpen(false)}
                    className="text-content/60 transition-colors hover:text-content"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-2">
                  {menu.map((m) =>
                    m.columns.length > 0 || m.featured ? (
                      <div key={m.id} className="border-b border-content/5">
                        <button
                          type="button"
                          onClick={() => setExpanded((e) => (e === m.id ? null : m.id))}
                          aria-expanded={expanded === m.id}
                          className="flex w-full items-center justify-between py-4 text-sm uppercase tracking-[0.18em] text-content/80"
                        >
                          {m.label}
                          <span className={`text-content/40 transition-transform duration-200 ${expanded === m.id ? "rotate-45" : ""}`}>+</span>
                        </button>
                        <AnimatePresence initial={false}>
                          {expanded === m.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="pb-4">
                                {m.featured && (
                                  <Link
                                    href={m.featured.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="relative mb-4 block aspect-[16/10] overflow-hidden rounded-sm"
                                  >
                                    <Image src={m.featured.img} alt={m.featured.label} fill sizes="100vw" className="object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                                    <span className="absolute bottom-3 left-3 flex items-center gap-1.5 text-[12px] uppercase tracking-[0.15em] text-white">
                                      {m.featured.label}
                                      <Arrow />
                                    </span>
                                  </Link>
                                )}
                                <div className="flex flex-col gap-1 pl-1">
                                  {m.columns.map((col) => (
                                    <div key={col.title || "geral"} className="mb-1">
                                      {col.title && (
                                        <p className="mb-1 mt-1 text-[10px] uppercase tracking-[0.2em] text-content/40">
                                          {col.title}
                                        </p>
                                      )}
                                      {col.links.map((l) => (
                                        <Link
                                          key={`${l.href}-${l.label}`}
                                          href={l.href}
                                          onClick={() => setMobileOpen(false)}
                                          className="block py-1.5 text-[13px] text-content/60 transition-colors hover:text-content"
                                        >
                                          {l.label}
                                        </Link>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        key={m.id}
                        href={m.href ?? "/"}
                        onClick={() => setMobileOpen(false)}
                        className="block border-b border-content/5 py-4 text-sm uppercase tracking-[0.18em] text-content/80"
                      >
                        {m.label}
                      </Link>
                    )
                  )}
                </div>

                <div className="grid grid-cols-2 gap-px border-t border-content/10 bg-content/10">
                  <Link
                    href="/produtos"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 bg-surface py-4 text-[12px] uppercase tracking-[0.15em] text-content/70"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                    </svg>
                    Buscar
                  </Link>
                  <Link
                    href="/conta"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 bg-surface py-4 text-[12px] uppercase tracking-[0.15em] text-content/70"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" strokeLinecap="round" />
                    </svg>
                    Minha conta
                  </Link>
                </div>
              </motion.nav>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
