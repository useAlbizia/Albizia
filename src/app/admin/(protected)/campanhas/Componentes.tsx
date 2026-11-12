"use client";

import { useActionState, useState, useTransition } from "react";
import { BotaoExcluir } from "@/components/admin/BotaoExcluir";
import { ACOES, REGIOES } from "@/lib/campanhas";
import { alternarCampanha, criarCampanha, excluirCampanha, type CampanhaState } from "./_actions";

const vazio: CampanhaState = {};
const campo = "w-full border-[1.5px] border-content/50 bg-transparent px-3 py-2.5 text-[16px] outline-none focus:border-content sm:text-sm";

export function AcoesCampanha({ id, ativo, nome }: { id: string; ativo: boolean; nome: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => alternarCampanha(id, !ativo))}
        className={ativo ? "bg-content px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
      >
        {ativo ? "Ligada" : "Desligada"}
      </button>
      <BotaoExcluir oQue={`a campanha "${nome}"`} disabled={pending} onConfirmar={() => start(() => excluirCampanha(id))} />
    </div>
  );
}

export function NovaCampanha({ ufs }: { ufs: string[] }) {
  const [state, action, pending] = useActionState(criarCampanha, vazio);
  const [tipo, setTipo] = useState<"uf" | "cep">("uf");
  const [acao, setAcao] = useState("gratis");
  const [marcados, setMarcados] = useState<string[]>([]);
  const unidade = ACOES.find((a) => a.v === acao)?.unidade ?? "";
  const alternarUf = (u: string) => setMarcados((m) => (m.includes(u) ? m.filter((x) => x !== u) : [...m, u]));
  const marcarRegiao = (lista: string[]) =>
    setMarcados((m) => (lista.every((u) => m.includes(u)) ? m.filter((u) => !lista.includes(u)) : [...new Set([...m, ...lista])]));

  return (
    <form action={action} className="flex flex-col gap-4 border-[1.5px] border-content px-4 py-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em]">Nova campanha</p>
      <input name="nome" placeholder="Nome que o cliente vê (ex.: Frete grátis Sul)" className={campo} required />

      <label className="flex flex-col gap-1 text-[13px]">
        O que a campanha faz
        <select name="acao" value={acao} onChange={(e) => setAcao(e.target.value)} className={campo}>
          {ACOES.map((a) => (
            <option key={a.v} value={a.v}>
              {a.rotulo}
            </option>
          ))}
        </select>
      </label>
      {unidade && (
        <label className="flex items-center gap-2 text-[14px]">
          {unidade === "R$" ? "R$" : ""}
          <input name="valor" inputMode="decimal" placeholder={unidade === "%" ? "10" : "2,50"} className={`${campo} w-28!`} />
          {unidade === "%" ? "%" : ""}
        </label>
      )}

      <div className="flex gap-2">
        {(["uf", "cep"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={tipo === t ? "bg-content px-4 py-2 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
          >
            {t === "uf" ? "Por estado / região" : "Por faixa de CEP"}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />
      {tipo === "uf" ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {Object.entries(REGIOES).map(([nome, lista]) => (
              <button key={nome} type="button" onClick={() => marcarRegiao(lista)} className="btn-sec">
                {nome}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1 sm:grid-cols-9">
            {ufs.map((u) => (
              <label
                key={u}
                className={`flex cursor-pointer items-center justify-center border px-1 py-2 text-[13px] font-medium ${
                  marcados.includes(u) ? "border-content bg-content text-surface" : "border-content/30"
                }`}
              >
                <input type="checkbox" name="ufs" value={u} checked={marcados.includes(u)} onChange={() => alternarUf(u)} className="sr-only" />
                {u}
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input name="cepInicio" placeholder="CEP inicial" inputMode="numeric" className={campo} />
          <input name="cepFim" placeholder="CEP final" inputMode="numeric" className={campo} />
        </div>
      )}

      <label className="flex flex-col gap-1 text-[13px]">
        Compra mínima em produtos (opcional)
        <input name="minimo" inputMode="decimal" placeholder="Ex.: 200,00" className={campo} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px]">
          Começa em (opcional)
          <input type="date" name="inicio" className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[13px]">
          Termina em (opcional)
          <input type="date" name="fim" className={campo} />
        </label>
      </div>

      <button type="submit" disabled={pending} className="self-start bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50">
        {pending ? "Salvando..." : "Criar campanha"}
      </button>
      {state.ok && <p className="text-[13px]">{state.ok}</p>}
      {state.erro && <p className="text-[13px] font-semibold">{state.erro}</p>}
    </form>
  );
}
