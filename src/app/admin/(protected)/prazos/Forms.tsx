"use client";

import { useActionState, useState, useTransition } from "react";
import { alternarRegra, criarRegra, excluirRegra, salvarRetirada, type PrazoState } from "./_actions";

const vazio: PrazoState = {};
const campo = "w-full border-[1.5px] border-content/50 bg-transparent px-3 py-2.5 text-[16px] outline-none focus:border-content sm:text-sm";

export function NovaRegra({ ufs, nomes }: { ufs: string[]; nomes: Record<string, string> }) {
  const [state, action, pending] = useActionState(criarRegra, vazio);
  const [tipo, setTipo] = useState<"uf" | "cep">("uf");
  return (
    <form action={action} className="flex flex-col gap-3 border-[1.5px] border-content px-4 py-4">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em]">Nova regra</p>
      <div className="flex gap-2">
        {(["uf", "cep"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={tipo === t ? "bg-content px-4 py-2 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
          >
            {t === "uf" ? "Por estado" : "Por faixa de CEP"}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />
      {tipo === "uf" ? (
        <select name="uf" className={campo} defaultValue="">
          <option value="" disabled>
            Escolha o estado
          </option>
          {ufs.map((u) => (
            <option key={u} value={u}>
              {u} · {nomes[u]}
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input name="cepInicio" placeholder="CEP inicial" inputMode="numeric" className={campo} />
          <input name="cepFim" placeholder="CEP final" inputMode="numeric" className={campo} />
        </div>
      )}
      <label className="flex items-center gap-3 text-[14px]">
        Dias a mais no prazo
        <input name="dias" type="number" min={1} max={30} defaultValue={1} className={`${campo} w-20!`} />
      </label>
      <input name="nome" placeholder="Nome da regra (opcional). Ex.: Interior do RJ" className={campo} />
      <button
        type="submit"
        disabled={pending}
        className="self-start bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Criar regra"}
      </button>
      {state.ok && <p className="text-[13px]">{state.ok}</p>}
      {state.erro && <p className="text-[13px] font-semibold">{state.erro}</p>}
    </form>
  );
}

export function AcoesRegra({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button type="button" disabled={pending} onClick={() => start(() => alternarRegra(id, !ativo))} className="btn-sec">
        {ativo ? "Desligar" : "Ligar"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir esta regra?")) start(() => excluirRegra(id));
        }}
        className="btn-perigo"
      >
        Excluir
      </button>
    </div>
  );
}

export function RetiradaForm(props: { ativo: boolean; endereco: string; instrucoes: string; prazoDias: number }) {
  const [state, action, pending] = useActionState(salvarRetirada, vazio);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex items-center gap-3 text-[15px] font-medium">
        <input type="checkbox" name="ativo" defaultChecked={props.ativo} className="h-5 w-5 accent-content" />
        Oferecer retirada no local no checkout
      </label>
      <input name="endereco" defaultValue={props.endereco} placeholder="Endereço de retirada" className={campo} />
      <textarea
        name="instrucoes"
        defaultValue={props.instrucoes}
        placeholder="Instruções (horário, com quem falar, documento)"
        rows={3}
        className={campo}
      />
      <label className="flex items-center gap-3 text-[14px]">
        Pronto para retirar em
        <input name="prazoDias" type="number" min={0} max={30} defaultValue={props.prazoDias} className={`${campo} w-20!`} />
        dias
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
      {state.ok && <p className="text-[13px]">{state.ok}</p>}
      {state.erro && <p className="text-[13px] font-semibold">{state.erro}</p>}
    </form>
  );
}
