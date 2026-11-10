"use client";

import { useTransition } from "react";
import { alternarStatus, excluirLancamento } from "../socios/_actions";

export function LancamentoAcoes({
  id,
  status,
  parcelado,
  descricao,
}: {
  id: string;
  status: string;
  parcelado: boolean;
  descricao: string;
}) {
  const [pending, start] = useTransition();
  const botao =
    "text-[11px] uppercase tracking-[0.1em] text-content/45 underline-offset-4 hover:text-content hover:underline disabled:opacity-40";

  // Dinheiro de sócio: excluir sempre pede confirmação, e o que some fica
  // na auditoria com valor e descrição.
  function excluir(tudo: boolean) {
    const msg = tudo
      ? `Excluir TODAS as parcelas de "${descricao}"?`
      : parcelado
        ? `Excluir só esta parcela de "${descricao}"?`
        : `Excluir "${descricao}"?`;
    if (confirm(`${msg}\n\nFica registrado na auditoria.`)) start(() => excluirLancamento(id, tudo));
  }

  return (
    <div className="flex flex-wrap gap-4">
      <button type="button" disabled={pending} onClick={() => start(() => alternarStatus(id))} className={botao}>
        {status === "pago" ? "marcar previsto" : "marcar pago"}
      </button>
      <button type="button" disabled={pending} onClick={() => excluir(false)} className={botao}>
        {parcelado ? "excluir parcela" : "excluir"}
      </button>
      {parcelado && (
        <button type="button" disabled={pending} onClick={() => excluir(true)} className={botao}>
          excluir compra
        </button>
      )}
    </div>
  );
}
