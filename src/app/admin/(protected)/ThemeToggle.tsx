"use client";

import { useThemePref, type ThemePref } from "@/lib/theme";

// Seletor de tema do painel: um ícone pequeno no topo, que troca a cada
// toque entre claro, escuro e automático.
//
// Na loja o tema segue o relógio (claro de dia, escuro de noite), que é parte
// da identidade da marca. No painel quem passa horas aqui escolhe. A
// preferência vale só dentro do /admin e fica no navegador de quem escolheu.

const ORDEM: ThemePref[] = ["light", "dark", "auto"];
const NOME: Record<ThemePref, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  auto: "Tema automático (segue o horário)",
};

export function ThemeToggle() {
  const { pref, setPref } = useThemePref();
  const proximo = ORDEM[(ORDEM.indexOf(pref) + 1) % ORDEM.length];

  return (
    <button
      type="button"
      onClick={() => setPref(proximo)}
      title={`${NOME[pref]}. Toque para trocar.`}
      aria-label={`${NOME[pref]}. Trocar para ${NOME[proximo].toLowerCase()}`}
      className="flex h-9 w-9 items-center justify-center rounded-full text-content/60 transition-colors hover:bg-content/[0.06] hover:text-content"
    >
      {pref === "light" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
      {pref === "dark" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
        </svg>
      )}
      {pref === "auto" && (
        // Metade sol, metade lua: claro de dia, escuro à noite.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none" />
        </svg>
      )}
    </button>
  );
}
