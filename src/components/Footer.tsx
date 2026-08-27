"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Symbol } from "./logo/Symbol";
import { NewsletterForm } from "./NewsletterForm";
import { PaymentBadges } from "./PaymentBadges";
import type { SiteSettings } from "@/lib/settings";

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/40">{title}</p>
      <div className="flex flex-col gap-2 text-[13px] text-content/60">{children}</div>
    </div>
  );
}

const linkClass = "transition-colors hover:text-content";

// A trust seal: small line icon + label in a pill.
function TrustBadge({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 border border-content/15 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-content/60">
      <span className="text-content/70">{icon}</span>
      {children}
    </span>
  );
}

const LockIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="10" width="16" height="11" rx="1.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
const ShieldIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Footer({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  const instaHandle = settings.instagram.replace(/^@/, "");
  const tiktokHandle = settings.tiktok.replace(/^@/, "");
  const fbUrl = settings.facebook
    ? settings.facebook.startsWith("http")
      ? settings.facebook
      : `https://facebook.com/${settings.facebook}`
    : "";
  const waDigits = settings.whatsapp.replace(/\D/g, "");

  const socials = [
    instaHandle && { label: "Instagram", href: `https://instagram.com/${instaHandle}`, icon: "instagram" },
    fbUrl && { label: "Facebook", href: fbUrl, icon: "facebook" },
    tiktokHandle && { label: "TikTok", href: `https://tiktok.com/@${tiktokHandle}`, icon: "tiktok" },
    waDigits && { label: "WhatsApp", href: `https://wa.me/${waDigits}`, icon: "whatsapp" },
  ].filter(Boolean) as { label: string; href: string; icon: string }[];

  return (
    <footer className="mt-32 border-t border-content/10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-14 md:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
          <Symbol className="h-6 w-6" />
          <span className="text-[11px] uppercase tracking-[0.25em] text-content/60">
            Silence becomes style.
          </span>
          {socials.length > 0 && (
            <div className="flex gap-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-content/50 transition-colors hover:text-content"
                >
                  <SocialIcon name={s.icon} />
                </a>
              ))}
            </div>
          )}
        </div>

        <Column title="Institucional">
          <Link href="/sobre" className={linkClass}>Sobre a ALBIZIA</Link>
          <Link href="/colecoes" className={linkClass}>Coleções</Link>
          <Link href="/produtos" className={linkClass}>Todos os produtos</Link>
        </Column>

        <Column title="Atendimento">
          <Link href="/acompanhar" className={linkClass}>Acompanhar pedido</Link>
          <Link href="/trocas" className={linkClass}>Trocas e Devoluções</Link>
          <Link href="/termos" className={linkClass}>Termos de Uso</Link>
          <Link href="/privacidade" className={linkClass}>Privacidade</Link>
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className={linkClass}>
              {settings.contactEmail}
            </a>
          )}
        </Column>

        <Column title="Minha Conta">
          <Link href="/conta" className={linkClass}>Entrar / Cadastrar</Link>
          <Link href="/conta" className={linkClass}>Meus pedidos</Link>
        </Column>

        <div className="col-span-2 md:col-span-1">
          <NewsletterForm />
        </div>
      </div>

      {/* Trust + payment badges */}
      <div className="border-t border-content/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-7">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <TrustBadge icon={LockIcon}>Site 100% seguro · SSL</TrustBadge>
            <TrustBadge icon={ShieldIcon}>Compra garantida</TrustBadge>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-content/40">Formas de pagamento</span>
            <PaymentBadges />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-10 pt-4 text-[11px] leading-relaxed tracking-wide text-content/40">
        © {new Date().getFullYear()} {settings.companyName || "ALBIZIA"}
        {settings.cnpj ? ` · CNPJ ${settings.cnpj}` : ""}
        {settings.address ? ` · ${settings.address}` : ""}
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const;
  if (name === "instagram")
    return (
      <svg {...p}>
        <path d="M12 2c2.7 0 3 0 4.1.1 1 .1 1.7.2 2.3.5.6.2 1.1.5 1.6 1 .5.5.8 1 1 1.6.2.6.4 1.3.5 2.3.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 1-.2 1.7-.5 2.3-.2.6-.5 1.1-1 1.6-.5.5-1 .8-1.6 1-.6.2-1.3.4-2.3.5-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-1-.1-1.7-.2-2.3-.5-.6-.2-1.1-.5-1.6-1-.5-.5-.8-1-1-1.6-.2-.6-.4-1.3-.5-2.3C2 15 2 14.7 2 12s0-3 .1-4.1c.1-1 .2-1.7.5-2.3.2-.6.5-1.1 1-1.6.5-.5 1-.8 1.6-1 .6-.2 1.3-.4 2.3-.5C9 2 9.3 2 12 2zm0 1.8c-2.6 0-3 0-4 .1-.8 0-1.2.2-1.5.3-.4.1-.7.3-1 .6-.3.3-.5.6-.6 1-.1.3-.3.7-.3 1.5-.1 1-.1 1.4-.1 4s0 3 .1 4c0 .8.2 1.2.3 1.5.1.4.3.7.6 1 .3.3.6.5 1 .6.3.1.7.3 1.5.3 1 .1 1.4.1 4 .1s3 0 4-.1c.8 0 1.2-.2 1.5-.3.4-.1.7-.3 1-.6.3-.3.5-.6.6-1 .1-.3.3-.7.3-1.5.1-1 .1-1.4.1-4s0-3-.1-4c0-.8-.2-1.2-.3-1.5-.1-.4-.3-.7-.6-1-.3-.3-.6-.5-1-.6-.3-.1-.7-.3-1.5-.3-1-.1-1.4-.1-4-.1zm0 3.1a5.1 5.1 0 1 1 0 10.2 5.1 5.1 0 0 1 0-10.2zm0 1.8a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6zm5.3-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" />
      </svg>
    );
  if (name === "facebook")
    return (
      <svg {...p}>
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
      </svg>
    );
  if (name === "tiktok")
    return (
      <svg {...p}>
        <path d="M16.5 3c.3 2 1.5 3.6 3.5 4v2.6c-1.3 0-2.5-.4-3.5-1v6.1c0 3-2.4 5.3-5.3 5.3A5.3 5.3 0 0 1 8 9.9v2.7a2.6 2.6 0 1 0 1.8 2.5V3h2.7c0 .2 0 .3.1.5 0 0 1.9-.5 3.9-.5z" />
      </svg>
    );
  // whatsapp
  return (
    <svg {...p}>
      <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 0 1 6.9 12.6l-.2.3.7 2.5-2.6-.7-.3.2A8.2 8.2 0 1 1 12 3.8zm-3 3.6c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.7 2.7 4.2 3.6 2 .8 2.4.7 2.9.6.5 0 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2 0-.1-.2-.2-.5-.3l-1.6-.8c-.2 0-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.2.2-.3.3-.5 0-.2 0-.3 0-.5l-.7-1.7c-.2-.5-.4-.4-.5-.5h-.4z" />
    </svg>
  );
}
