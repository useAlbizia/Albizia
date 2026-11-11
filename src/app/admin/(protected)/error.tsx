"use client";

import Link from "next/link";
import { useEffect } from "react";
import { registrarErroAparelho } from "./erros/_actions";

// Quando uma tela do painel falha, mostra isto em vez de nada. O código do
// erro (digest) é o que permite achar a falha exata nos registros da Vercel:
// basta mandar o print.
export default function ErroPainel({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    // O erro do servidor já é gravado pelo instrumentation; este grava o que
    // a pessoa viu, com a tela e o código, para cruzar os dois.
    void registrarErroAparelho({
      mensagem: `Tela não abriu: ${error.message || "erro sem mensagem"}`,
      detalhe: error.stack ?? "",
      caminho: typeof location !== "undefined" ? location.pathname : "",
      codigo: error.digest ?? "",
    }).catch(() => {});
  }, [error]);

  return (
    <div className="flex max-w-lg flex-col gap-4 py-10">
      <h1 className="text-lg font-medium">Esta tela não abriu.</h1>
      <p className="text-[14px] leading-relaxed text-content/75">
        Tente de novo. Se continuar, abra Ajustes → Erros do sistema: o erro já foi registrado lá, com tudo para mandar ao
        suporte.
      </p>
      {error.digest && <p className="font-mono text-[12px] text-content/60">Código: {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface">
          Tentar de novo
        </button>
        <Link href="/admin" className="btn-sec">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
