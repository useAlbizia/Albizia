"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Symbol } from "./logo/Symbol";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="mt-32 border-t border-content/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 text-content/70">
          <Symbol className="h-6 w-6" />
          <span className="text-[11px] uppercase tracking-[0.25em]">Silence becomes style.</span>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-3 text-[13px] uppercase tracking-[0.15em] text-content/60">
          <Link href="/colecoes" className="hover:text-content">
            Coleções
          </Link>
          <Link href="/sobre" className="hover:text-content">
            Sobre
          </Link>
          <Link href="/carrinho" className="hover:text-content">
            Carrinho
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-10 text-[11px] tracking-wide text-content/40">
        © {new Date().getFullYear()} ALBIZIA
      </div>
    </footer>
  );
}
