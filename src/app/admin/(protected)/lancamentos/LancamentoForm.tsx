"use client";

import { useActionState, useState } from "react";
import { criarLancamento, type FinState } from "../socios/_actions";

const vazio: FinState = {};
const input =
  "border border-content/30 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-content";
const rotulo = "text-[10px] uppercase tracking-[0.15em] text-content/45";

type Tipo = "despesa" | "aporte" | "receita" | "devolucao_aporte" | "distribuicao_lucro";

// Cada tipo com a frase que a pessoa usaria para descrever o que aconteceu,
// porque "aporte" e "devolução de aporte" não são palavras do dia a dia.
const TIPOS: { v: Tipo; nome: string; frase: string }[] = [
  { v: "despesa", nome: "Gasto da empresa", frase: "Comprou ou pagou algo para a empresa." },
  { v: "aporte", nome: "Sócio colocou dinheiro", frase: "Pix ou depósito de um sócio na conta da empresa." },
  { v: "receita", nome: "Entrada avulsa", frase: "Dinheiro que entrou fora do site, como uma venda em mãos." },
  { v: "devolucao_aporte", nome: "Devolver a um sócio", frase: "A empresa devolvendo o que um sócio colocou a mais." },
  { v: "distribuicao_lucro", nome: "Dividir lucro", frase: "A parte do lucro paga a um sócio." },
];

export function LancamentoForm({
  socios,
  categorias,
  formas,
  hoje,
}: {
  socios: { id: string; nome: string }[];
  categorias: readonly string[];
  formas: readonly string[];
  hoje: string;
}) {
  const [state, action, pending] = useActionState(criarLancamento, vazio);
  const [tipo, setTipo] = useState<Tipo>("despesa");
  const [parcelas, setParcelas] = useState(1);
  const despesa = tipo === "despesa";
  const deSocio = tipo === "aporte" || tipo === "devolucao_aporte" || tipo === "distribuicao_lucro";

  return (
    <form action={action} className="flex flex-col gap-4 border border-content/15 px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Novo lançamento</p>

      <div className="flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <label
            key={t.v}
            className={`cursor-pointer border px-3 py-2 text-[12px] transition-colors ${
              tipo === t.v ? "border-content" : "border-content/20 text-content/60 hover:border-content/50"
            }`}
          >
            <input
              type="radio"
              name="tipo"
              value={t.v}
              checked={tipo === t.v}
              onChange={() => {
                setTipo(t.v);
                if (t.v !== "despesa") setParcelas(1);
              }}
              className="sr-only"
            />
            {t.nome}
          </label>
        ))}
      </div>
      <p className="-mt-2 text-[11px] text-content/45">{TIPOS.find((t) => t.v === tipo)?.frase}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_150px]">
        <label className="flex flex-col gap-1">
          <span className={rotulo}>O que foi</span>
          <input
            name="descricao"
            required
            placeholder={despesa ? "Ex.: 50 camisetas lisas pretas" : "Ex.: Pix para repor estoque"}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={rotulo}>{parcelas > 1 ? "Valor total" : "Valor"}</span>
          <input name="valor" required inputMode="decimal" placeholder="1.234,56" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={rotulo}>{parcelas > 1 ? "1ª parcela" : "Data"}</span>
          <input name="data" type="date" required defaultValue={hoje} className={input} />
        </label>
      </div>

      {despesa && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Quem pagou</span>
            <select name="quemPagou" required defaultValue="" className={input}>
              <option value="" disabled>
                Escolha
              </option>
              <option value="empresa">A empresa (saiu do caixa)</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} (do próprio bolso)
                </option>
              ))}
              <option value="dividir">Dividido entre os sócios</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Categoria</span>
            <select name="categoria" defaultValue={categorias[0]} className={input}>
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {deSocio && (
        <label className="flex flex-col gap-1 sm:max-w-sm">
          <span className={rotulo}>Sócio</span>
          <select name="socioId" required defaultValue="" className={input}>
            <option value="" disabled>
              Escolha
            </option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_120px]">
        <label className="flex flex-col gap-1">
          <span className={rotulo}>{despesa ? "Onde comprou" : "Observação curta"}</span>
          <input
            name={despesa ? "fornecedor" : "observacao"}
            placeholder={despesa ? "Loja, site ou fornecedor" : "Opcional"}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={rotulo}>Forma de pagamento</span>
          <select name="formaPagamento" defaultValue={formas[0]} className={input}>
            {formas.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        {despesa && (
          <label className="flex flex-col gap-1">
            <span className={rotulo}>Parcelas</span>
            <input
              name="parcelas"
              type="number"
              min={1}
              max={48}
              value={parcelas}
              onChange={(e) => setParcelas(Math.max(1, Number(e.target.value) || 1))}
              className={input}
            />
          </label>
        )}
      </div>

      {despesa && parcelas > 1 && (
        <p className="-mt-1 text-[11px] leading-relaxed text-content/45">
          Vira {parcelas} lançamentos, um por mês a partir da data da 1ª parcela. As que já venceram
          entram como pagas; as futuras entram como previstas e você marca quando a fatura for paga.
          Com "dividido entre os sócios", cada parcela é repartida igualmente.
        </p>
      )}

      {despesa && (
        <input name="observacao" placeholder="Observação (opcional)" className={input} />
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-content px-6 py-2.5 text-[12px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Lançando..." : "Lançar"}
        </button>
        {state.mensagem && <span className="text-[13px] text-content/55">{state.mensagem}</span>}
        {state.error && <span className="text-[13px] text-content/80">{state.error}</span>}
      </div>
    </form>
  );
}
