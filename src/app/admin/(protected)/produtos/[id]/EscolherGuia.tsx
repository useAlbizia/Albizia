"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { definirGuia } from "../../guias/_actions";

export function EscolherGuia({
  productId,
  atual,
  guias,
  temCores,
}: {
  productId: string;
  atual: string | null;
  guias: { id: string; nome: string }[];
  temCores: boolean;
}) {
  const [valor, setValor] = useState(atual ?? "");
  const [todas, setTodas] = useState(true);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {guias.length === 0 ? (
        <p className="text-[13px] text-content/70">
          Nenhum guia criado ainda.{" "}
          <Link href="/admin/guias" className="underline underline-offset-4">
            Criar guia de tamanhos
          </Link>
        </p>
      ) : (
        <>
          <select
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="border-[1.5px] border-content/50 bg-transparent px-3 py-2.5 text-[16px] sm:text-sm"
          >
            <option value="">Guia padrão da loja</option>
            {guias.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
          {temCores && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} className="h-4 w-4 accent-content" />
              Aplicar a todas as cores deste modelo
            </label>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await definirGuia(productId, valor, todas && temCores);
                  setMsg(r.erro ?? r.ok ?? "");
                })
              }
              className="btn-sec"
            >
              {pending ? "Salvando..." : "Salvar guia do produto"}
            </button>
            {msg && <span className="text-[13px]">{msg}</span>}
          </div>
          <Link href="/admin/guias" className="text-[13px] underline underline-offset-4">
            Editar os guias
          </Link>
        </>
      )}
    </div>
  );
}
