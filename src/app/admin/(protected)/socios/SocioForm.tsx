"use client";

import { useActionState } from "react";
import { salvarSocio, type FinState } from "./_actions";

const vazio: FinState = {};
const input =
  "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

export type SocioEdit = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cotas: number;
  ativo: boolean;
};

export function SocioForm({ socio }: { socio: SocioEdit }) {
  const [state, action, pending] = useActionState(salvarSocio.bind(null, socio.id), vazio);

  return (
    <form action={action} className="flex flex-col gap-2 border border-content/10 px-4 py-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_70px]">
        <input name="nome" defaultValue={socio.nome} placeholder="Nome" className={input} />
        <input name="email" type="email" defaultValue={socio.email} placeholder="E-mail" autoComplete="off" className={input} />
        <input name="telefone" defaultValue={socio.telefone} placeholder="WhatsApp" inputMode="tel" className={input} />
        <input name="cotas" type="number" min={1} max={100} defaultValue={socio.cotas} title="Cotas" className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[12px] text-content/60">
          <input type="checkbox" name="ativo" defaultChecked={socio.ativo} className="accent-content" />
          Sócio ativo
        </label>
        <button
          type="submit"
          disabled={pending}
          className="border border-content/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
        >
          {pending ? "..." : "Salvar"}
        </button>
        {state.ok && <span className="text-[12px] text-content/50">Salvo ✓</span>}
        {state.error && <span className="text-[12px] text-content/75">{state.error}</span>}
      </div>
    </form>
  );
}
