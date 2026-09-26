"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "dark";

// "auto" = o comportamento da marca (claro de dia, escuro de noite).
// As outras duas são escolha explícita de quem está no painel.
export type ThemePref = "auto" | "light" | "dark";

export const THEME_STORAGE_KEY = "albizia-admin-theme";

// The Albizia closes its leaves at night and opens them by day. The site
// mirrors that on each visitor's own local clock — someone in Tokyo at
// dusk and someone in São Paulo at noon see two different, equally
// correct states of the same tree.
export function computeTheme(date = new Date()): Theme {
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

// Compara a rota inteira, não só o prefixo: `startsWith("/admin")` casaria
// também com algo como /administrativo, que é rota de loja.
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

// A preferência manual vale SÓ dentro do /admin. Na loja o tema continua
// seguindo o relógio, que é parte da identidade da marca e não deve depender
// do que alguém escolheu no painel.
export function resolveTheme(pathname: string, pref: ThemePref, date = new Date()): Theme {
  if (pref !== "auto" && isAdminPath(pathname)) return pref;
  return computeTheme(date);
}

export function readStoredPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "auto";
  } catch {
    // Janela anônima ou storage bloqueado: cai no comportamento da marca.
    return "auto";
  }
}

type Ctx = { theme: Theme; pref: ThemePref; setPref: (p: ThemePref) => void };

const ThemeContext = createContext<Ctx>({ theme: "light", pref: "auto", setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  // Starts "light" to match the server-rendered markup, then corrects
  // itself right after mount (the blocking script in <head> already set the
  // DOM attribute pre-paint, so only this one client render briefly lags).
  const [theme, setTheme] = useState<Theme>("light");
  const [pref, setPrefState] = useState<ThemePref>("auto");

  useEffect(() => {
    setPrefState(readStoredPref());
  }, []);

  useEffect(() => {
    const apply = () => {
      const next = resolveTheme(pathname, pref);
      setTheme(next);
      document.documentElement.dataset.theme = next;
    };
    apply();

    // O relógio só precisa ser reconsultado quando o tema segue o horário.
    // Sem esta guarda o intervalo desfaria a escolha manual a cada minuto,
    // que é exatamente o bug que essa funcionalidade poderia introduzir.
    if (pref !== "auto" && isAdminPath(pathname)) return;

    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, [pathname, pref]);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      if (p === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      // Sem storage a escolha vale só nesta aba, o que ainda é melhor que nada.
    }
  }, []);

  const value = useMemo(() => ({ theme, pref, setPref }), [theme, pref, setPref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Contrato antigo preservado: os componentes de logo esperam só o tema.
export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemePref() {
  const { pref, setPref, theme } = useContext(ThemeContext);
  return { pref, setPref, theme };
}
