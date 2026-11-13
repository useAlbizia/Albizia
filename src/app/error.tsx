"use client";

import Link from "next/link";
import { useEffect } from "react";

// Quando uma página da LOJA falha, o cliente vê isto (e não a tela padrão em
// inglês). O erro do servidor já foi gravado pelo instrumentation; aqui fica
// registrado também o que o cliente viu, com o código para cruzar.
export default function ErroLoja({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/erros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensagem: `Página não abriu para o cliente: ${error.message || "erro sem mensagem"}`,
        detalhe: `${error.digest ? `código ${error.digest}\n` : ""}${error.stack ?? ""}`,
        caminho: location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-sm uppercase tracking-[0.3em] text-content/70">Algo não saiu como deveria</h1>
      <p className="text-[15px] leading-relaxed text-content/75">
        Já fomos avisados e estamos olhando. Tente de novo; se continuar, fale com a gente pelo chat.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="bg-content px-6 py-3 text-[12px] uppercase tracking-[0.15em] text-surface">
          Tentar de novo
        </button>
        <Link href="/" className="border border-content px-6 py-3 text-[12px] uppercase tracking-[0.15em]">
          Ir para o início
        </Link>
      </div>
    </section>
  );
}
