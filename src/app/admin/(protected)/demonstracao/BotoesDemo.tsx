"use client";

import { useActionState } from "react";
import { apagarExemplo, gerarExemplo, type DemoState } from "./_actions";

const vazio: DemoState = {};

export function BotoesDemo({ ativo }: { ativo: boolean }) {
  const [g, gerar, gerando] = useActionState(gerarExemplo, vazio);
  const [a, apagar, apagando] = useActionState(apagarExemplo, vazio);
  const msg = a.ok ?? g.ok ?? a.erro ?? g.erro;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={gerar}>
          <button
            type="submit"
            disabled={gerando || apagando}
            className="bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
          >
            {gerando ? "Gerando..." : ativo ? "Gerar de novo" : "Gerar exemplo de 40 dias"}
          </button>
        </form>
        {ativo && (
          <form
            action={apagar}
            onSubmit={(e) => {
              if (!confirm("Apagar todo o exemplo? Só os dados de exemplo saem; o que é real fica.")) e.preventDefault();
            }}
          >
            <button
              type="submit"
              disabled={gerando || apagando}
              className="border-2 border-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] disabled:opacity-50"
            >
              {apagando ? "Apagando..." : "Apagar exemplo"}
            </button>
          </form>
        )}
      </div>
      {msg && <p className="text-[13px] text-content/75">{msg}</p>}
    </div>
  );
}
