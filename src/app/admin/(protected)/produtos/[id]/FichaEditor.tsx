"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { adicionarNaFicha, copiarFicha, removerDaFicha, type InsumoState } from "../../insumos/_actions";
import { custoDaFicha, custoLinhaExato, formatarCustoExato } from "@/lib/ficha-calc";
import { brl } from "@/lib/format";

const vazio: InsumoState = {};
const input = "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

type Insumo = { id: string; nome: string; tipo: string; unidade: string; loteValorCents: number; loteQuantidadeMil: number };
type Linha = { id: string; quantidadeMil: number; insumo: Insumo };

const qtd = (mil: number) => (mil / 1000).toString().replace(".", ",");

export function FichaEditor({
  productId,
  linhas,
  insumos,
  outrosProdutos,
}: {
  productId: string;
  linhas: Linha[];
  insumos: Insumo[];
  outrosProdutos: { id: string; nome: string }[];
}) {
  const [state, action, pending] = useActionState(adicionarNaFicha.bind(null, productId), vazio);
  const [removendo, startRemover] = useTransition();
  const [copiando, startCopiar] = useTransition();
  const [origem, setOrigem] = useState("");
  const [msgCopia, setMsgCopia] = useState<string | null>(null);

  const total = custoDaFicha(
    linhas.map((l) => ({
      loteValorCents: l.insumo.loteValorCents,
      loteQuantidadeMil: l.insumo.loteQuantidadeMil,
      quantidadeMil: l.quantidadeMil,
    })),
  );
  // Envelope é um por pedido; ele não aparece aqui para não ser escolhido.
  const disponiveis = insumos.filter((i) => i.tipo !== "embalagem_pedido");

  return (
    <div className="flex flex-col gap-4">
      {linhas.length > 0 ? (
        <div className="border border-content/12">
          {linhas.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 border-b border-content/8 px-4 py-2.5 text-sm last:border-b-0">
              <div className="min-w-0">
                <p className="truncate">{l.insumo.nome}</p>
                <p className="text-[11px] text-content/45">
                  {qtd(l.quantidadeMil)} {l.insumo.unidade}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-content/75">
                  {formatarCustoExato(
                    custoLinhaExato({
                      loteValorCents: l.insumo.loteValorCents,
                      loteQuantidadeMil: l.insumo.loteQuantidadeMil,
                      quantidadeMil: l.quantidadeMil,
                    }),
                  )}
                </span>
                <button
                  type="button"
                  disabled={removendo}
                  onClick={() => {
                    if (confirm(`Tirar "${l.insumo.nome}" da ficha?`)) startRemover(() => removerDaFicha(productId, l.id));
                  }}
                  className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content disabled:opacity-40"
                  aria-label={`Remover ${l.insumo.nome}`}
                >
                  tirar
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-baseline justify-between bg-content/[0.03] px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.15em] text-content/60">Custo de uma peça</span>
            <span className="text-lg">{brl(total)}</span>
          </div>
        </div>
      ) : (
        <p className="text-[12px] leading-relaxed text-content/45">
          Sem ficha, o custo da peça é o digitado no campo ao lado. Com ficha, ele é calculado aqui e
          atualizado sozinho quando o preço de um insumo muda.
        </p>
      )}

      {disponiveis.length === 0 ? (
        <p className="text-[12px] text-content/55">
          Cadastre os insumos primeiro em{" "}
          <Link href="/admin/insumos" className="underline underline-offset-4">
            Insumos
          </Link>
          .
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-2 sm:flex-row">
          <select name="insumoId" required defaultValue="" className={`${input} flex-1`}>
            <option value="" disabled>
              Adicionar insumo
            </option>
            {disponiveis.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome} ({i.unidade})
              </option>
            ))}
          </select>
          <input name="quantidade" required inputMode="decimal" defaultValue="1" placeholder="Qtd por peça" className={`${input} sm:w-28`} />
          <button
            type="submit"
            disabled={pending}
            className="border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
          >
            {pending ? "..." : "Adicionar"}
          </button>
        </form>
      )}
      {state.error && <p className="text-[12px] text-content/80">{state.error}</p>}

      {outrosProdutos.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-content/10 pt-4 sm:flex-row sm:items-center">
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className={`${input} flex-1`}>
            <option value="">Copiar a ficha de outro produto</option>
            {outrosProdutos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!origem || copiando}
            onClick={() => {
              const aviso = linhas.length
                ? "Isso troca a ficha atual pela do outro produto. Continuar?"
                : "Copiar a ficha do outro produto?";
              if (!confirm(aviso)) return;
              startCopiar(async () => {
                const r = await copiarFicha(productId, origem);
                setMsgCopia(r.error ?? r.mensagem ?? null);
              });
            }}
            className="border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-40"
          >
            {copiando ? "..." : "Copiar"}
          </button>
        </div>
      )}
      {msgCopia && <p className="text-[12px] text-content/60">{msgCopia}</p>}
    </div>
  );
}
