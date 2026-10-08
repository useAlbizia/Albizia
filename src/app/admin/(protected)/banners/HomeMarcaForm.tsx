"use client";

import { useActionState } from "react";
import { saveHomeMarca, type BannerState } from "./_actions";

const vazio: BannerState = {};

export function HomeMarcaForm({
  introEnabled,
  brandSlideEnabled,
  brandSlidePosition,
}: {
  introEnabled: boolean;
  brandSlideEnabled: boolean;
  brandSlidePosition: "first" | "last";
}) {
  const [state, action, pending] = useActionState(saveHomeMarca, vazio);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4 border border-content/15 px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">A árvore na home</p>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="introEnabled" defaultChecked={introEnabled} className="mt-1 accent-content" />
        <span>
          Abertura na primeira visita
          <span className="mt-0.5 block text-[11px] leading-relaxed text-content/45">
            A árvore se desenha por pouco mais de um segundo e dá lugar ao banner. Aparece uma vez por
            visitante, só na home, e some com um toque. Quem já viu entra direto no banner.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="brandSlideEnabled"
          defaultChecked={brandSlideEnabled}
          className="mt-1 accent-content"
        />
        <span>
          Slide da marca no banner
          <span className="mt-0.5 block text-[11px] leading-relaxed text-content/45">
            A árvore, o nome e a frase como um dos slides, com as cores do tema: claro de dia,
            escuro de noite. Sem nenhuma campanha ativa ele aparece sempre, para o topo da home
            nunca ficar vazio.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3 pl-7 text-sm">
        <span className="text-[12px] text-content/55">Posição:</span>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="brandSlidePosition"
            value="first"
            defaultChecked={brandSlidePosition === "first"}
            className="accent-content"
          />
          antes das campanhas
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="brandSlidePosition"
            value="last"
            defaultChecked={brandSlidePosition === "last"}
            className="accent-content"
          />
          depois das campanhas
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-content px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state.ok && <span className="text-[13px] text-content/50">Salvo ✓</span>}
        {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
      </div>
    </form>
  );
}
