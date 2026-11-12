"use client";

import { useState, useTransition } from "react";
import { BotaoExcluir } from "@/components/admin/BotaoExcluir";
import { excluirGuia, salvarGuia } from "./_actions";

// Editor de um guia de tamanhos: uma tabela onde cada célula é um campo.
// Botões para pôr e tirar tamanho (linha) e medida (coluna).

const campo = "w-full min-w-0 border border-content/40 bg-transparent px-2 py-2 text-[16px] outline-none focus:border-content sm:text-sm";

export function EditorGuia(props: { id?: string; nome?: string; colunas?: string[]; linhas?: string[][]; observacao?: string }) {
  const [nome, setNome] = useState(props.nome ?? "");
  const [colunas, setColunas] = useState<string[]>(props.colunas ?? ["Tamanho", "Largura (peito)", "Comprimento", "Ombro"]);
  const [linhas, setLinhas] = useState<string[][]>(
    props.linhas ?? [["P", "", "", ""], ["M", "", "", ""], ["G", "", "", ""], ["GG", "", "", ""]],
  );
  const [observacao, setObservacao] = useState(
    props.observacao ?? "Medidas da peça (não do corpo), com variação de 2 cm para mais ou para menos.",
  );
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const mudaCelula = (l: number, c: number, v: string) =>
    setLinhas((ls) => ls.map((row, i) => (i === l ? row.map((x, j) => (j === c ? v : x)) : row)));

  return (
    <div className="flex flex-col gap-4 border-[1.5px] border-content px-4 py-4">
      <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do modelo (ex.: Peruana manga over)" className={campo} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>
              {colunas.map((c, j) => (
                <th key={j} className="p-1 align-bottom">
                  <input
                    value={c}
                    onChange={(e) => setColunas((cs) => cs.map((x, k) => (k === j ? e.target.value : x)))}
                    className={`${campo} font-semibold`}
                    aria-label={`Nome da coluna ${j + 1}`}
                  />
                  {j > 0 && colunas.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setColunas((cs) => cs.filter((_, k) => k !== j));
                        setLinhas((ls) => ls.map((r) => r.filter((_, k) => k !== j)));
                      }}
                      className="mt-1 text-[11px] underline underline-offset-2"
                    >
                      tirar coluna
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j} className="p-1">
                    <input value={v} onChange={(e) => mudaCelula(i, j, e.target.value)} placeholder={j === 0 ? "Tamanho" : "Ex.: 72 cm"} className={campo} />
                  </td>
                ))}
                <td className="p-1">
                  <button type="button" onClick={() => setLinhas((ls) => ls.filter((_, k) => k !== i))} className="text-[11px] underline underline-offset-2" aria-label="Tirar este tamanho">
                    tirar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setLinhas((ls) => [...ls, colunas.map(() => "")])} className="btn-sec">
          + Tamanho
        </button>
        {colunas.length < 8 && (
          <button
            type="button"
            onClick={() => {
              setColunas((cs) => [...cs, "Nova medida"]);
              setLinhas((ls) => ls.map((r) => [...r, ""]));
            }}
            className="btn-sec"
          >
            + Medida
          </button>
        )}
      </div>
      <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className={campo} placeholder="Observação que aparece embaixo da tabela" />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await salvarGuia({ id: props.id, nome, colunas, linhas, observacao });
              setMsg(r.erro ?? "Guia salvo.");
            })
          }
          className="bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar guia"}
        </button>
        {props.id && (
          <BotaoExcluir oQue={`o guia "${props.nome}"`} onConfirmar={() => start(() => excluirGuia(props.id!))} disabled={pending} />
        )}
        {msg && <span className="text-[13px] font-medium">{msg}</span>}
      </div>
    </div>
  );
}
