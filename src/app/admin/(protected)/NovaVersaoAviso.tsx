"use client";

import { useEffect, useState } from "react";

// Aviso de versão nova publicada enquanto o painel estava aberto.
//
// POR QUE EXISTE: quando a Vercel publica, o Next.js gera novos
// identificadores para as Server Actions. Uma aba aberta desde antes do
// deploy chama um identificador que não existe mais e o clique simplesmente
// não faz nada, com um erro críptico só no console.
//
// POR QUE NÃO RECARREGA SOZINHO: recarregar no meio de um formulário
// preenchido apaga o que a pessoa digitou. Então a página avisa e deixa a
// decisão com quem está usando. Quem está só navegando clica e segue; quem
// está no meio de um cadastro termina antes.

const ASSINATURAS = [
  "Server Action",
  "failed-to-find-server-action",
  "UnrecognizedActionError",
];

function ehAcaoSumida(mensagem: string): boolean {
  return ASSINATURAS.some((a) => mensagem.includes(a));
}

export function NovaVersaoAviso() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const mostrar = () => setVisivel(true);

    const onError = (e: ErrorEvent) => {
      if (ehAcaoSumida(e.message ?? "")) mostrar();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg = typeof r === "string" ? r : (r?.message ?? "");
      if (ehAcaoSumida(msg)) mostrar();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!visivel) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md flex-col gap-3 border border-content/30 bg-surface p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-[12px] uppercase tracking-[0.15em] text-content/70">Nova versão</p>
        <p className="mt-1 text-[12px] leading-relaxed text-content/50">
          O site foi atualizado enquanto esta aba estava aberta. Recarregue para o botão voltar a
          funcionar. Se estiver preenchendo algo, salve antes.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="border border-content px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-content hover:text-surface"
        >
          Recarregar
        </button>
        <button
          type="button"
          onClick={() => setVisivel(false)}
          aria-label="Dispensar aviso"
          className="border border-content/25 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-content/50 transition-colors hover:border-content"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
