"use client";

import { useState, useTransition } from "react";
import { sincronizarMercadoPago } from "./_actions";

export function SincronizarMp() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <span className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sincronizarMercadoPago();
            setMsg(r.error ?? r.mensagem ?? null);
          })
        }
        className="border border-content/40 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
      >
        {pending ? "Lendo..." : "Ler do Mercado Pago agora"}
      </button>
      {msg && <span className="text-[12px] text-content/55">{msg}</span>}
    </span>
  );
}
