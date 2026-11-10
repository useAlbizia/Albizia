"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ativarNotificacoes, testarNotificacao } from "./_notificacoes";

// Tudo que precisa chamar a atenção de quem abre o painel, em qualquer tela:
// - a faixa de lançamentos esperando a SUA aprovação;
// - o número no ícone do aplicativo;
// - o convite para ligar as notificações no aparelho.

const CHAVE_ADIADO = "albizia-notif-adiado";

function chaveDoServidor(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(b.length));
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

type Estado = "carregando" | "sem-suporte" | "instalar-iphone" | "pedir" | "negado" | "ligado";

export function AvisosPainel({
  pendentes,
  pushPronto,
  contas = { n: 0, totalCents: 0 },
}: {
  pendentes: number;
  pushPronto: boolean;
  /** Partes de parcela DESTE sócio vencendo hoje ou atrasadas. */
  contas?: { n: number; totalCents: number };
}) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [adiado, setAdiado] = useState(true);
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

  // Número no ícone do app, sempre igual ao que falta aprovar.
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    const total = pendentes + contas.n;
    if (total > 0) nav.setAppBadge?.(total).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [pendentes, contas.n]);

  // Lê o navegador só depois de montar: no servidor não existe localStorage
  // nem permissão de notificação, e ler antes daria tela diferente na hidratação.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setAdiado(Number(localStorage.getItem(CHAVE_ADIADO) ?? 0) > Date.now());
    } catch {
      setAdiado(false);
    }
    const iphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const temPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!temPush) {
      setEstado(iphone && !instalado ? "instalar-iphone" : "sem-suporte");
      return;
    }
    if (Notification.permission === "denied") return setEstado("negado");
    if (Notification.permission === "granted") {
      // Já permitiu: garante o service worker e a inscrição gravada (a
      // inscrição pode ter sido renovada pelo navegador).
      setEstado("ligado");
      if (pushPronto && chave) void inscrever(false);
      return;
    }
    setEstado("pedir");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function inscrever(pedirPermissao: boolean) {
    setOcupado(true);
    setMsg("");
    try {
      if (pedirPermissao) {
        const p = await Notification.requestPermission();
        if (p !== "granted") {
          setEstado(p === "denied" ? "negado" : "pedir");
          return;
        }
      }
      const reg = await navigator.serviceWorker.register("/sw-painel.js", { scope: "/admin" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveDoServidor(chave) }));
      const r = await ativarNotificacoes(sub.toJSON(), navigator.userAgent);
      if (!r.ok) {
        setMsg(r.erro ?? "Não foi possível ligar agora.");
        return;
      }
      setEstado("ligado");
      if (pedirPermissao) {
        const t = await testarNotificacao();
        setMsg(t.ok ? "Pronto. Mandamos uma notificação de teste." : "Ligado. Se a notificação de teste não aparecer, confira se o celular não está no modo silencioso.");
      }
    } catch {
      setMsg("Não foi possível ligar as notificações neste aparelho.");
    } finally {
      setOcupado(false);
    }
  }

  function adiar() {
    try {
      localStorage.setItem(CHAVE_ADIADO, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    } catch {}
    setAdiado(true);
  }

  const mostrarConvite =
    pushPronto && !!chave && !adiado && (estado === "pedir" || estado === "instalar-iphone");

  if (pendentes === 0 && contas.n === 0 && !mostrarConvite && !msg) return null;
  const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="flex flex-col gap-3 px-4 pt-4 md:px-6">
      {contas.n > 0 && (
        <Link
          href="/admin/lancamentos#contas"
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-2 border-content px-5 py-4"
        >
          <span className="text-[14px] leading-snug">
            <strong>
              {contas.n === 1 ? "Você tem 1 conta" : `Você tem ${contas.n} contas`} para pagar: {brl(contas.totalCents)}.
            </strong>{" "}
            <span className="text-content/65">Vence hoje ou já venceu.</span>
          </span>
          <span className="shrink-0 bg-content px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-surface">Ver</span>
        </Link>
      )}

      {pendentes > 0 && (
        <Link
          href="/admin/lancamentos?aprovar=1"
          className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 bg-content px-5 py-4 text-surface"
        >
          <span className="text-[14px] leading-snug">
            <strong>
              {pendentes} {pendentes === 1 ? "lançamento espera" : "lançamentos esperam"} a sua aprovação.
            </strong>{" "}
            <span className="opacity-75">Enquanto não aprovar, não entra nas contas.</span>
          </span>
          <span className="shrink-0 border border-surface/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em]">
            Aprovar
          </span>
        </Link>
      )}

      {mostrarConvite && (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 border border-content/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {estado === "instalar-iphone" ? (
            <p className="text-[13px] leading-relaxed text-content/75">
              <strong className="text-content">Quer receber avisos no iPhone?</strong> Instale o painel: no Safari, toque
              em Compartilhar e em Adicionar à Tela de Início. Depois abra pelo ícone e ligue as notificações aqui.
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-content/75">
              <strong className="text-content">Ligue as notificações.</strong> O celular avisa na hora quando um sócio
              lança algo para você aprovar, mesmo com o app fechado.
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {estado === "pedir" && (
              <button
                type="button"
                onClick={() => inscrever(true)}
                disabled={ocupado}
                className="bg-content px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
              >
                {ocupado ? "Ligando..." : "Ligar notificações"}
              </button>
            )}
            <button type="button" onClick={adiar} className="px-3 py-2.5 text-[11px] uppercase tracking-[0.12em] text-content/50">
              Agora não
            </button>
          </div>
        </div>
      )}

      {msg && <p className="mx-auto w-full max-w-5xl text-[13px] text-content/70">{msg}</p>}
    </div>
  );
}
