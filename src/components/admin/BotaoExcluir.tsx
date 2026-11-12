"use client";

// Botão de excluir padrão do painel: SEMPRE pede confirmação (antes, um toque
// apagava direto, e o Jair apagou um cupom sem querer).
// - Normal: "Excluir X? Não dá para desfazer."
// - Crítico (`palavra`): a pessoa precisa digitar a palavra, por exemplo
//   EXCLUIR, para apagar algo que leva outras coisas junto (um item do menu da
//   loja com seus links).
// Funciona dentro de <form action={...}> (é um botão de enviar que cancela o
// envio se a pessoa desistir) ou com onConfirmar.

export function BotaoExcluir({
  oQue,
  palavra,
  onConfirmar,
  rotulo = "Excluir",
  disabled,
}: {
  oQue: string;
  palavra?: string;
  onConfirmar?: () => void;
  rotulo?: string;
  disabled?: boolean;
}) {
  function confirmou(): boolean {
    if (palavra) {
      const r = window.prompt(
        `Excluir ${oQue}? Isso apaga também o que está dentro e não dá para desfazer.\n\nPara confirmar, digite ${palavra}:`,
      );
      return (r ?? "").trim().toUpperCase() === palavra.toUpperCase();
    }
    return window.confirm(`Excluir ${oQue}? Não dá para desfazer.`);
  }
  return (
    <button
      type={onConfirmar ? "button" : "submit"}
      disabled={disabled}
      className="btn-perigo"
      onClick={(e) => {
        if (!confirmou()) {
          e.preventDefault();
          return;
        }
        onConfirmar?.();
      }}
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
      </svg>
      {rotulo}
    </button>
  );
}
