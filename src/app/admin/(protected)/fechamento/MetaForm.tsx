"use client";

import { useActionState } from "react";
import { salvarMeta, type FinState } from "../socios/_actions";

const vazio: FinState = {};

export function MetaForm({ mes, atual }: { mes: string; atual: string }) {
  const [state, action, pending] = useActionState(salvarMeta.bind(null, mes), vazio);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input
        name="meta"
        inputMode="decimal"
        defaultValue={atual}
        placeholder="Meta de vendas do mês (R$)"
        className="w-52 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
      >
        {pending ? "..." : "Salvar meta"}
      </button>
      {state.ok && <span className="text-[12px] text-content/50">Salvo ✓</span>}
      {state.error && <span className="text-[12px] text-content/75">{state.error}</span>}
    </form>
  );
}
