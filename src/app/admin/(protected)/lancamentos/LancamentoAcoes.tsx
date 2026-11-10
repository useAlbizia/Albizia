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
  const botao =
    "text-[11px] uppercase tracking-[0.1em] text-content/45 underline-offset-4 hover:text-content hover:underline disabled:opacity-40";

  // Dinheiro de sócio: excluir sempre pede confirmação, e o que some fica
  // na auditoria com valor e descrição.
  function excluir() {
    const msg = parcelado ? `Excluir a compra "${descricao}" com TODAS as parcelas?` : `Excluir "${descricao}"?`;
    if (confirm(`${msg}\n\nFica registrado na auditoria.`)) start(() => excluirLancamento(id, parcelado));
  }

  return (
    <button type="button" disabled={pending} onClick={excluir} className={botao}>
      {pending ? "excluindo..." : parcelado ? "excluir compra" : "excluir"}
    </button>
  );
}
