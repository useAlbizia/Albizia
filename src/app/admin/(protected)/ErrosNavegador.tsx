"use client";

import { useEffect } from "react";
import { registrarErroAparelho } from "./erros/_actions";

// Escuta erros de JavaScript no aparelho de quem usa o painel (celular ou
// computador) e manda para "Erros do sistema". No máximo 5 por tela, para um
// erro repetido não virar uma enxurrada. Não mostra nada na tela.

const RUIDO = /ResizeObserver|Script error\.?$|Load failed|NEXT_REDIRECT|NEXT_NOT_FOUND/i;

export function ErrosNavegador() {
  useEffect(() => {
    let enviados = 0;
    const vistos = new Set<string>();
    const mandar = (mensagem: string, detalhe: string) => {
      if (!mensagem || RUIDO.test(mensagem) || enviados >= 5 || vistos.has(mensagem)) return;
      vistos.add(mensagem);
      enviados++;
      void registrarErroAparelho({ mensagem, detalhe, caminho: location.pathname }).catch(() => {});
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
  }, []);
  return null;
}
