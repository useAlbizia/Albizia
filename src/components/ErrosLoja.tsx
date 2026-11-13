"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Erros de JavaScript no aparelho do CLIENTE, em toda a loja, enviados para
// Erros do sistema (o painel tem o próprio, com login). No máximo 5 por
// visita, sem repetir a mesma mensagem. Não mostra nada na tela.

const RUIDO = /ResizeObserver|Script error\.?$|Load failed|NEXT_REDIRECT|NEXT_NOT_FOUND|AbortError|cancelad/i;

export function ErrosLoja() {
  const pathname = usePathname();
  const noPainel = pathname.startsWith("/admin");

  useEffect(() => {
    if (noPainel) return;
    let enviados = 0;
    const vistos = new Set<string>();
    const mandar = (mensagem: string, detalhe: string) => {
      if (!mensagem || RUIDO.test(mensagem) || enviados >= 5 || vistos.has(mensagem)) return;
      vistos.add(mensagem);
      enviados++;
      void fetch("/api/erros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem, detalhe, caminho: location.pathname }),
        keepalive: true,
      }).catch(() => {});
    };
    const onErro = (e: ErrorEvent) => mandar(e.message ?? "", e.error?.stack ?? `${e.filename}:${e.lineno}`);
    const onRejeicao = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string;
      mandar(typeof r === "string" ? r : (r?.message ?? ""), typeof r === "string" ? "" : (r?.stack ?? ""));
    };
    window.addEventListener("error", onErro);
    window.addEventListener("unhandledrejection", onRejeicao);
    return () => {
      window.removeEventListener("error", onErro);
      window.removeEventListener("unhandledrejection", onRejeicao);
    };
  }, [noPainel]);

  return null;
}
