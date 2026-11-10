"use client";

import { useTransition } from "react";
import { excluirLancamento } from "../socios/_actions";

// Pagamento é marcado parte por parte, com o botão Pagar de cada parcela
// (ParcelaPagadores). Aqui sobrou só excluir.
export function LancamentoAcoes({
  id,
  parcelado,
  descricao,
}: {
  id: string;
  parcelado: boolean;
  descricao: string;
}) {
  const [pending, start] = useTransition();

  // Dinheiro de sócio: excluir sempre pede confirmação, e o que some fica
  // na auditoria com valor e descrição.
  function excluir() {
    const msg = parcelado ? `Excluir a compra "${descricao}" com TODAS as parcelas?` : `Excluir "${descricao}"?`;
    if (confirm(`${msg}\n\nFica registrado na auditoria.`)) start(() => excluirLancamento(id, parcelado));
  }

  return (
    <button type="button" disabled={pending} onClick={excluir} className="btn-perigo">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
      </svg>
      {pending ? "Excluindo..." : parcelado ? "Excluir compra" : "Excluir"}
    </button>
  );
}
