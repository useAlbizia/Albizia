"use client";

import { useEffect } from "react";
import { Symbol } from "@/components/logo/Symbol";
import { Wordmark } from "@/components/logo/Wordmark";

export const INTRO_STORAGE_KEY = "albizia-intro-visto";

// Os traços da árvore, na ordem em que ela cresce: tronco, galhos de baixo,
// galhos de cima, broto e bandeira. Geometria tirada da arte real do símbolo
// (viewBox 874x897), em 1,25s no total: na abertura a
// pessoa ainda não escolheu esperar, então ela tem que ser curta.
// [caminho, início (s), duração (s)]
const TRACOS: [string, number, number][] = [
  ["M444 887 L451 40", 0.0, 0.5],
  ["M366 652 L52 430", 0.44, 0.32],
  ["M522 652 L822 430", 0.44, 0.32],
  ["M402 470 L84 223", 0.67, 0.32],
  ["M486 470 L804 223", 0.67, 0.32],
  ["M470 208 L560 156", 0.93, 0.19],
  ["M346 158 L452 56", 1.03, 0.21],
];

/**
 * A abertura: a árvore se desenhando por pouco mais de um segundo, uma vez
 * por visitante, só na home.
 *
 * Toda a animação e o sumiço são CSS (ver globals.css), então este componente
 * só faz duas coisas: anota que a pessoa já viu, para a próxima visita
 * começar direto no banner, e deixa pular com um toque.
 */
export function IntroAlbizia() {
  useEffect(() => {
    try {
      localStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {
      // Janela anônima ou armazenamento bloqueado: a pessoa vê a abertura
      // de novo na próxima visita, o que é aceitável.
    }
  }, []);

  function pular() {
    document.documentElement.setAttribute("data-intro", "visto");
  }

  return (
    <div className="intro-albizia" aria-hidden="true" onClick={pular}>
      <div className="relative h-32 sm:h-40">
        <svg
          viewBox="0 0 874 897"
          className="intro-esboco block h-full w-auto"
          fill="none"
          stroke="currentColor"
          strokeWidth={15}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {TRACOS.map(([d, ini, dur], i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              className="intro-traco"
              style={{ ["--ini" as string]: `${ini}s`, ["--dur" as string]: `${dur}s` }}
            />
          ))}
        </svg>
        <div className="intro-solido absolute inset-0 flex items-center justify-center">
          <Symbol className="h-full w-auto" />
        </div>
      </div>
      <div className="intro-nome">
        <Wordmark className="h-7 w-auto sm:h-9" />
      </div>
    </div>
  );
}
