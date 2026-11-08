"use client";

import { useActionState, useEffect, useState } from "react";
import { salvarInsumo, type InsumoState } from "./_actions";
import {
  custoUnitarioExato,
  formatarCustoExato,
  parseQuantidade,
  TIPOS_INSUMO,
  UNIDADES,
} from "@/lib/ficha-calc";
import { parseReais } from "@/lib/financeiro-calc";

const vazio: InsumoState = {};
const input = "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

export type InsumoEdit = {
  id: string;
  nome: string;
  tipo: string;
  unidade: string;
  loteValor: string;
  loteQuantidade: string;
  fornecedor: string;
  ativo: boolean;
  usos: number;
};

export function InsumoForm({ insumo }: { insumo?: InsumoEdit }) {
  const [state, action, pending] = useActionState(salvarInsumo.bind(null, insumo?.id ?? ""), vazio);
  // Cálculo ao vivo do custo por unidade, para a pessoa ver na hora se
  // digitou certo ("1000 por 35,00" tem que dar 3,5 centavos, não R$ 35).
  const [valor, setValor] = useState(insumo?.loteValor ?? "");
  const [qtd, setQtd] = useState(insumo?.loteQuantidade ?? "");
  const [unidade, setUnidade] = useState(insumo?.unidade ?? "un");
  const v = parseReais(valor);
  const q = parseQuantidade(qtd);
  const unitario = v !== null && q !== null ? custoUnitarioExato({ loteValorCents: v, loteQuantidadeMil: q }) : null;

  // Cadastro novo salvo: limpa os campos, para o mesmo insumo não ser
  // cadastrado duas vezes por um segundo clique.
  useEffect(() => {
    if (state.ok && !insumo) {
      setValor("");
      setQtd("");
    }
  }, [state, insumo]);

  return (
    <form action={action} className="flex flex-col gap-2 border border-content/12 px-4 py-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.6fr_1fr_80px]">
        <input name="nome" defaultValue={insumo?.nome} required placeholder="Nome (ex.: Peruana lisa preta)" className={input} />
        <select name="tipo" defaultValue={insumo?.tipo ?? "peca"} className={input}>
          {TIPOS_INSUMO.map((t) => (
            <option key={t.v} value={t.v}>
              {t.nome}
            </option>
          ))}
        </select>
        <select name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className={input}>
          {UNIDADES.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1.4fr]">
        <input
          name="loteValor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          required
          placeholder="Paguei (R$)"
          className={input}
        />
        <input
          name="loteQuantidade"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          inputMode="decimal"
          required
          placeholder={`Por quantos (${unidade})`}
          className={input}
        />
        <input name="fornecedor" defaultValue={insumo?.fornecedor} placeholder="Fornecedor (opcional)" className={input} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-[12px] text-content/60">
          {unitario !== null ? `= ${formatarCustoExato(unitario)} por ${unidade}` : "Preencha o que pagou e quantos vieram"}
        </span>
        {insumo && (
          <label className="flex items-center gap-2 text-[12px] text-content/55">
            <input type="checkbox" name="ativo" defaultChecked={insumo.ativo} className="accent-content" />
            Ativo
          </label>
        )}
        <button
          type="submit"
          disabled={pending}
          className="border border-content/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
        >
          {pending ? "..." : insumo ? "Salvar" : "Cadastrar"}
        </button>
        {insumo && insumo.usos > 0 && (
          <span className="text-[11px] text-content/40">usado em {insumo.usos} produto(s)</span>
        )}
        {state.mensagem && <span className="text-[12px] text-content/55">{state.mensagem}</span>}
        {state.error && <span className="text-[12px] text-content/80">{state.error}</span>}
      </div>
    </form>
  );
}
