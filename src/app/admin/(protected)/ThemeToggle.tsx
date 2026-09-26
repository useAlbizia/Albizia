"use client";

import { useThemePref, type ThemePref } from "@/lib/theme";

// Seletor de tema do painel.
//
// Na loja o tema segue o relógio (claro de dia, escuro de noite), que é parte
// da identidade da marca. No painel isso não faz sentido: quem passa horas
// aqui precisa escolher. A preferência vale só dentro do /admin e fica no
// navegador de quem escolheu, então não afeta a loja nem os outros admins.

const OPCOES: { valor: ThemePref; rotulo: string; titulo: string }[] = [
  { valor: "auto", rotulo: "Auto", titulo: "Segue o horário: claro de dia, escuro à noite" },
  { valor: "light", rotulo: "Claro", titulo: "Sempre claro no painel" },
  { valor: "dark", rotulo: "Escuro", titulo: "Sempre escuro no painel" },
];

export function ThemeToggle() {
  const { pref, setPref } = useThemePref();

  return (
    <div>
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-content/40">Tema</p>
      <div
        role="group"
        aria-label="Tema do painel"
        className="flex overflow-hidden rounded-[3px] border border-content/20"
      >
        {OPCOES.map((o) => {
          const ativo = pref === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => setPref(o.valor)}
              aria-pressed={ativo}
              title={o.titulo}
              className={`flex-1 px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] transition-colors ${
                ativo
                  ? "bg-content text-surface"
                  : "text-content/50 hover:bg-content/5 hover:text-content"
              }`}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
