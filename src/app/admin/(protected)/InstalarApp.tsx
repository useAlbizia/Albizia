"use client";

import { useEffect, useState } from "react";

// Botão "Instalar app", sempre à vista no topo do painel.
//
// O painel é instalado pelo próprio navegador, sem loja e sem APK (APK não
// instala no iPhone). No Android e no computador o Chrome oferece a
// instalação direto, e o botão chama essa janela. No iPhone a Apple não
// deixa um site abrir a instalação sozinho, então o botão mostra os dois
// toques que a pessoa precisa dar no Safari. Depois de instalado, o botão
// some.

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function jaInstalado(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalado, setInstalado] = useState(true);
  const [ajuda, setAjuda] = useState<null | "iphone" | "outro">(null);

  useEffect(() => {
    setInstalado(jaInstalado());
    const pegar = (e: Event) => {
      // Guarda o convite do navegador para usar no clique do botão.
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const feito = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", pegar);
    window.addEventListener("appinstalled", feito);
    return () => {
      window.removeEventListener("beforeinstallprompt", pegar);
      window.removeEventListener("appinstalled", feito);
    };
  }, []);

  if (instalado) return null;

  const iphone = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (evento) {
            await evento.prompt();
            const r = await evento.userChoice.catch(() => ({ outcome: "" }));
            if (r.outcome === "accepted") setInstalado(true);
            setEvento(null);
            return;
          }
          setAjuda(iphone ? "iphone" : "outro");
        }}
        className="flex items-center gap-1.5 rounded-full border border-content/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-content/75 transition-colors hover:border-content hover:text-content"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
        </svg>
        Instalar app
      </button>

      {ajuda && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setAjuda(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Instalar o painel"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm border border-content/15 bg-surface p-5 text-content shadow-2xl"
          >
            <p className="text-base">Instalar o painel ALBIZIA</p>
            {ajuda === "iphone" ? (
              <ol className="mt-3 ml-5 list-decimal space-y-2 text-[14px] leading-relaxed text-content/75">
                <li>Este passo precisa do <strong>Safari</strong>. Se estiver em outro navegador, abra este endereço no Safari.</li>
                <li>
                  Toque no botão de <strong>compartilhar</strong>, o quadrado com a seta para cima, na barra de baixo.
                </li>
                <li>
                  Role e toque em <strong>Adicionar à Tela de Início</strong>, depois em <strong>Adicionar</strong>.
                </li>
              </ol>
            ) : (
              <ol className="mt-3 ml-5 list-decimal space-y-2 text-[14px] leading-relaxed text-content/75">
                <li>Abra este endereço no <strong>Chrome</strong> ou no <strong>Edge</strong>.</li>
                <li>
                  No celular: toque nos <strong>três pontos</strong> e em <strong>Instalar app</strong>. No computador: clique
                  no ícone de instalar na barra de endereço.
                </li>
              </ol>
            )}
            <p className="mt-3 text-[12px] text-content/50">O ícone da ALBIZIA aparece na tela inicial e abre direto no painel.</p>
            <button
              type="button"
              onClick={() => setAjuda(null)}
              className="mt-4 w-full border border-content py-2.5 text-[12px] uppercase tracking-[0.15em]"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
