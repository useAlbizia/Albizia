"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Symbol } from "./logo/Symbol";
import type { SiteSettings } from "@/lib/settings";

export function Footer({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const instaHandle = settings.instagram.replace(/^@/, "");

  return (
    <footer className="mt-32 border-t border-content/10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-3">
        <div className="flex flex-col gap-3 text-content/70">
          <Symbol className="h-6 w-6" />
          <span className="text-[11px] uppercase tracking-[0.25em]">Silence becomes style.</span>
        </div>

        <div className="flex flex-col gap-2 text-[13px] uppercase tracking-[0.15em] text-content/60">
          <Link href="/colecoes" className="hover:text-content">
            Coleções
          </Link>
          <Link href="/sobre" className="hover:text-content">
            Sobre
          </Link>
          <Link href="/carrinho" className="hover:text-content">
            Carrinho
          </Link>
          {instaHandle && (
            <a
              href={`https://instagram.com/${instaHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-content"
            >
              Instagram
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2 text-[13px] uppercase tracking-[0.15em] text-content/60">
          <Link href="/termos" className="hover:text-content">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-content">
            Privacidade
          </Link>
          <Link href="/trocas" className="hover:text-content">
            Trocas e Devoluções
          </Link>
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="normal-case tracking-normal hover:text-content">
              {settings.contactEmail}
            </a>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-10 text-[11px] leading-relaxed tracking-wide text-content/40">
        © {new Date().getFullYear()} {settings.companyName || "ALBIZIA"}
        {settings.cnpj ? ` · CNPJ ${settings.cnpj}` : ""}
        {settings.address ? ` · ${settings.address}` : ""}
      </div>
    </footer>
  );
}
