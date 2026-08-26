"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "./logo/Wordmark";
import { converge } from "@/lib/motion";
import { useCart } from "@/lib/cart-context";

const NAV = [
  { href: "/produtos", label: "Produtos" },
  { href: "/colecoes/essential", label: "Essential" },
  { href: "/colecoes/signature", label: "Signature" },
  { href: "/colecoes/studio", label: "Studio" },
  { href: "/colecoes/moda-praia", label: "Moda Praia" },
  { href: "/sobre", label: "Sobre" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { totalCount, openCart } = useCart();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-content/10 bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label="ALBIZIA"
          className="text-content"
          onClick={() => setOpen(false)}
        >
          <Wordmark className="h-4 w-auto sm:h-5" />
        </Link>

        <nav className="hidden gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] uppercase tracking-[0.18em] text-content/70 transition-colors hover:text-content"
            >
              {item.label}
            </Link>
          ))}
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
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-6 flex-col items-center justify-center gap-1.5 md:hidden"
          >
            <span
              className={`h-px w-5 bg-content transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-5 bg-content transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            variants={converge}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col gap-1 border-t border-content/10 px-6 pb-6 pt-2 md:hidden"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm uppercase tracking-[0.18em] text-content/80"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/conta"
              onClick={() => setOpen(false)}
              className="py-3 text-sm uppercase tracking-[0.18em] text-content/80"
            >
              Conta
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
