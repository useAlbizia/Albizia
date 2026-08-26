"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const KEY = "albizia-announcement-dismissed";

export function AnnouncementBar({ text }: { text: string }) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    // Reads browser-only storage after mount (avoids a hydration mismatch).
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      // Re-show if the message text changed since it was dismissed.
      setDismissed(window.localStorage.getItem(KEY) === text);
    } catch {
      setDismissed(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [text]);

  if (!text.trim() || dismissed || pathname?.startsWith("/admin")) return null;

  return (
    <div className="relative bg-content px-10 py-2.5 text-center text-surface">
      <span className="text-[11px] uppercase tracking-[0.18em]">{text}</span>
      <button
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, text);
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        aria-label="Fechar aviso"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface/70 transition-colors hover:text-surface"
      >
        ✕
      </button>
    </div>
  );
}
