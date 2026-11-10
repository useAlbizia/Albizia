"use client";

import { useState, useTransition } from "react";
import { desfazerPagamento, registrarPagamento } from "../socios/_actions";

// O botão Pagar de UMA parte de uma parcela (a parte do Nilson, a do Jair).
// Toca em Pagar, confere a data (hoje já vem marcado) e confirma. Paga, a
// parte mostra a data e um "desfazer" pequeno para engano.

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export function PagarParte({
  pagadorId,
  pagoEm,
  hoje,
  rotulo,
}: {
  pagadorId: string;
  pagoEm: string | null;
  hoje: string;
  /** "Pagar R$ 75,00", para o botão dizer o valor. */
  rotulo: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  if (pagoEm) {
    return (
      <span className="flex items-center gap-2 text-[12px] text-content/60">
        <span>✓ pago em {dataBr(pagoEm)}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Desfazer este pagamento? Ele volta para Contas a pagar.")) start(() => desfazerPagamento(pagadorId));
          }}
          className="text-[11px] text-content/40 underline underline-offset-2"
        >
          desfazer
        </button>
      </span>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="border border-content bg-content px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-surface"
      >
        {rotulo}
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-content/60">Pago em</span>
      <input
        type="date"
        value={data}
        max={hoje}
        onChange={(e) => setData(e.target.value)}
        className="border border-content/30 bg-transparent px-2 py-1 text-[16px] sm:text-[13px]"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await registrarPagamento(pagadorId, data);
            if (r.erro) setErro(r.erro);
          })
        }
        className="border border-content bg-content px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-surface disabled:opacity-50"
      >
        {pending ? "..." : "Confirmar"}
      </button>
      <button type="button" onClick={() => setAberto(false)} className="text-[11px] text-content/50">
        cancelar
      </button>
      {erro && <span className="w-full text-[12px] text-content/80">{erro}</span>}
    </span>
  );
}
