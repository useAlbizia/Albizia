"use client";

import { useState, useTransition } from "react";
import { votar } from "../socios/_actions";
import { LancamentoForm } from "./LancamentoForm";

export function NovoLancamento(props: {
  socios: { id: string; nome: string }[];
  categorias: readonly string[];
  formas: readonly string[];
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button
        type="button"
        data-tour="lancar"
        onClick={() => setAberto(true)}
        className="w-full bg-content py-4 text-[13px] uppercase tracking-[0.2em] text-surface sm:w-auto sm:px-10"
      >
        + Novo lançamento
      </button>
    );
  }
  return (
    <div data-tour="lancar" className="border border-content/20 px-4 py-5 sm:px-6">
      <LancamentoForm {...props} onFechar={() => setAberto(false)} />
    </div>
  );
}

/** Cartão de um lançamento esperando o voto de quem está logado. */
export function CartaoAprovar({ chave, titulo, detalhe, valor, autor }: { chave: string; titulo: string; detalhe: string; valor: string; autor: string }) {
  const [pend, start] = useTransition();
  const [contestando, setContestando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const enviar = (decisao: "aprovado" | "contestado") =>
    start(async () => {
      const r = await votar(chave, decisao, motivo);
      setMsg(r.error ?? r.mensagem ?? null);
    });

  return (
    <div className="border border-content/25 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px]">{titulo}</p>
          <p className="mt-0.5 text-[12px] text-content/50">
            Lançado por <strong className="text-content/75">{autor}</strong> · {detalhe}
          </p>
        </div>
        <p className="shrink-0 text-base">{valor}</p>
      </div>

      {msg ? (
        <p className="mt-3 text-[13px] text-content/70">{msg}</p>
      ) : contestando ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O que está errado?"
            autoFocus
            className="border border-content/30 bg-transparent px-3 py-2.5 text-base outline-none focus:border-content"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setContestando(false)} className="btn-sec">
              Voltar
            </button>
            <button
              type="button"
              disabled={pend || !motivo.trim()}
              onClick={() => enviar("contestado")}
              className="flex-1 border border-content py-2.5 text-[12px] uppercase tracking-[0.15em] disabled:opacity-40"
            >
              {pend ? "..." : "Enviar contestação"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={pend}
            onClick={() => enviar("aprovado")}
            className="flex-1 bg-content py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-40"
          >
            {pend ? "..." : "Aprovar"}
          </button>
          <button
            type="button"
            disabled={pend}
            onClick={() => setContestando(true)}
            className="btn-sec flex-1 py-3!"
          >
            Contestar
          </button>
        </div>
      )}
    </div>
  );
}
