"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

// The Albizia closes its leaves at night and opens them by day. The site
// mirrors that on each visitor's own local clock — someone in Tokyo at
// dusk and someone in São Paulo at noon see two different, equally
// correct states of the same tree.
export function computeTheme(date = new Date()): Theme {
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

const ThemeContext = createContext<Theme>("light");

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts "light" to match the server-rendered markup, then corrects
  // itself right after mount from the visitor's real local clock (the
  // blocking script in <head> already set the DOM attribute pre-paint,
  // so only this one client render briefly lags behind).
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const apply = () => {
      const next = computeTheme();
      setTheme(next);
      document.documentElement.dataset.theme = next;
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
