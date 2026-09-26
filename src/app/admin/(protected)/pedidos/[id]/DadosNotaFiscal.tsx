"use client";

import { useState } from "react";

// Painel de preenchimento de nota fiscal.
//
// A loja é MEI e emite manualmente, campo por campo, no emissor. Isso aqui
// não emite nada: só põe cada dado que o emissor pede em ordem, com um botão
// de copiar do lado, para ninguém ficar caçando informação espalhada pela
// tela nem redigitar CPF errado.

export type CampoNota = { rotulo: string; valor: string; dica?: string };
export type ItemNota = {
  descricao: string;
  ncm: string;
  quantidade: number;
  unitario: string;
  total: string;
};

function Copiar({ valor }: { valor: string }) {
  const [copiado, setCopiado] = useState(false);

  if (!valor) return null;

  return (
    <button
      type="button"
      aria-label={`Copiar ${valor}`}
      onClick={() => {
        navigator.clipboard.writeText(valor).then(
          () => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
          },
          () => setCopiado(false),
        );
      }}
      className="shrink-0 border border-content/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-content/45 transition-colors hover:border-content hover:text-content"
    >
      {copiado ? "copiado" : "copiar"}
    </button>
  );
}

function Linha({ campo }: { campo: CampoNota }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-content/5 py-2">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">{campo.rotulo}</p>
        <p className="mt-0.5 break-words text-[13px] text-content/80">
          {campo.valor || <span className="text-content/30">não informado</span>}
        </p>
        {campo.dica && <p className="mt-0.5 text-[10px] text-content/35">{campo.dica}</p>}
      </div>
      <Copiar valor={campo.valor} />
    </div>
  );
}

export function DadosNotaFiscal({
  destinatario,
  itens,
  totais,
  blocoCompleto,
}: {
  destinatario: CampoNota[];
  itens: ItemNota[];
  totais: CampoNota[];
  blocoCompleto: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="mt-10 border border-content/15">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between px-5 py-3.5"
      >
        <span className="text-[11px] uppercase tracking-[0.2em] text-content/60">
          Dados para nota fiscal
        </span>
        <span className={`text-content/40 transition-transform duration-200 ${aberto ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      {aberto && (
        <div className="border-t border-content/10 px-5 pb-5 pt-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pt-3">
            <p className="text-[11px] leading-relaxed text-content/40">
              Cada campo com um botão de copiar, na ordem que o emissor pede.
            </p>
            <Copiar valor={blocoCompleto} />
          </div>

          <p className="mb-1 mt-4 text-[10px] uppercase tracking-[0.2em] text-content/50">
            Destinatário
          </p>
          {destinatario.map((c) => (
            <Linha key={c.rotulo} campo={c} />
          ))}

          <p className="mb-1 mt-6 text-[10px] uppercase tracking-[0.2em] text-content/50">
            Itens
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.1em] text-content/40">
                  <th className="py-1.5 pr-3 font-normal">Descrição</th>
                  <th className="py-1.5 pr-3 font-normal">NCM</th>
                  <th className="py-1.5 pr-3 font-normal">Qtd</th>
                  <th className="py-1.5 pr-3 font-normal">Unitário</th>
                  <th className="py-1.5 font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-content/5">
                {itens.map((i, n) => (
                  <tr key={n}>
                    <td className="py-2 pr-3 text-content/75">{i.descricao}</td>
                    <td className="py-2 pr-3 font-mono text-content/60">{i.ncm}</td>
                    <td className="py-2 pr-3 text-content/60">{i.quantidade}</td>
                    <td className="py-2 pr-3 text-content/60">{i.unitario}</td>
                    <td className="py-2 text-content/75">{i.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-1 mt-6 text-[10px] uppercase tracking-[0.2em] text-content/50">
            Valores e operação
          </p>
          {totais.map((c) => (
            <Linha key={c.rotulo} campo={c} />
          ))}
        </div>
      )}
    </div>
  );
}
