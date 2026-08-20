"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "./logo/Wordmark";
import { converge } from "@/lib/motion";
import { useCart } from "@/lib/cart-context";

const NAV = [
  { href: "/colecoes/essential", label: "Essential" },
  { href: "/colecoes/signature", label: "Signature" },
  { href: "/colecoes/studio", label: "Studio" },
  { href: "/colecoes/moda-praia", label: "Moda Praia" },
  { href: "/sobre", label: "Sobre" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { totalCount } = useCart();
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

        <div className="flex items-center gap-6">
          <Link
            href="/carrinho"
            className="text-[13px] uppercase tracking-[0.18em] text-content/70 transition-colors hover:text-content"
          >
            Carrinho{totalCount > 0 ? ` (${totalCount})` : ""}
          </Link>
          <button
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
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
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
