"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { registrarErroAparelho } from "./erros/_actions";

// Escuta erros de JavaScript no aparelho de quem usa o painel (celular ou
// computador) e manda para "Erros do sistema". No máximo 5 por tela, para um
// erro repetido não virar uma enxurrada. Não mostra nada na tela.

const RUIDO = /ResizeObserver|Script error\.?$|Load failed|NEXT_REDIRECT|NEXT_NOT_FOUND/i;

export function ErrosNavegador() {
  // Lentidão e travamento: mede do toque num link do painel até a tela nova
  // aparecer. Mais de 5 s vira registro "Lentidão"; 20 s sem abrir vira
  // "Tela não abriu". Travar não é erro de programa, então sem isto não
  // ficava nada anotado (foi o que aconteceu em 10/11/2026).
  const pathname = usePathname();
  const inicio = useRef<{ destino: string; t: number; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  useEffect(() => {
    const onClique = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith("/admin") || url.pathname === location.pathname) return;
      if (inicio.current?.timer) clearTimeout(inicio.current.timer);
      const destino = url.pathname;
      const t = performance.now();
      const timer = setTimeout(() => {
        void registrarErroAparelho({
          tipo: "lentidao",
          mensagem: `Tela não abriu em 20 s: ${destino}`,
          caminho: destino,
          detalhe: `Saindo de ${location.pathname}. Conexão: ${(navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? "?"}`,
        }).catch(() => {});
      }, 20_000);
      inicio.current = { destino, t, timer };
    };
    document.addEventListener("click", onClique, true);
    return () => document.removeEventListener("click", onClique, true);
  }, []);

  useEffect(() => {
    const atual = inicio.current;
    if (!atual || atual.destino !== pathname) return;
    if (atual.timer) clearTimeout(atual.timer);
    const ms = performance.now() - atual.t;
    inicio.current = null;
    if (ms > 5000) {
      void registrarErroAparelho({
        tipo: "lentidao",
        mensagem: `Tela demorou ${(ms / 1000).toFixed(1)} s para abrir: ${pathname}`,
        caminho: pathname,
      }).catch(() => {});
    }
  }, [pathname]);

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
