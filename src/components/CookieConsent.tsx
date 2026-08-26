"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "albizia-cookie-consent";

export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Reads browser-only storage after mount (avoids a hydration mismatch).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setShow(window.localStorage.getItem(KEY) !== "accepted");
    } catch {
      setShow(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function accept() {
    try {
      window.localStorage.setItem(KEY, "accepted");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  if (!show || pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-content/10 bg-surface/95 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-[12px] leading-relaxed text-content/60">
          Usamos cookies para melhorar sua experiência de navegação e analisar o tráfego. Ao
          continuar, você concorda com nossa{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-content">
            Política de Privacidade
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 border border-content bg-content px-8 py-2.5 text-[12px] uppercase tracking-[0.2em] text-surface transition-opacity hover:opacity-90"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
