"use client";

import { useState, useTransition } from "react";
import { sendRecovery } from "./_actions";

export function RecoveryButton({ orderId, sentAt }: { orderId: string; sentAt: string | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(
    sentAt ? `Enviado ${new Date(sentAt).toLocaleDateString("pt-BR")}` : null
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            const r = await sendRecovery(orderId);
            setResult(r.ok ? "Enviado ✓" : r.error ?? "Erro");
          })
        }
        disabled={pending}
        className="border border-content/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-content/70 transition-colors hover:border-content disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar lembrete"}
      </button>
      {result && <span className="text-[11px] text-content/40">{result}</span>}
    </div>
  );
}
