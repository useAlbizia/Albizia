"use client";

import { useState, useTransition } from "react";
import { ajustarVencimento } from "../socios/_actions";

// Corrige o vencimento de uma compra parcelada ou conta fixa já lançada:
// informa a 1ª parcela e as outras seguem mês a mês, em dia útil.
export function AjustarVencimento({ grupoId, atual }: { grupoId: string; atual: string }) {
  const [aberto, setAberto] = useState(false);
  const [data, setData] = useState(atual);
  const [erro, setErro] = useState("");
  const [pending, start] = useTransition();

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn-sec">
        Ajustar vencimento
      </button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 border border-content/25 px-3 py-3">
      <p className="text-[13px]">Vencimento da 1ª parcela (as outras seguem mês a mês, sempre em dia útil):</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="border-[1.5px] border-content bg-transparent px-3 py-2 text-[16px]"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await ajustarVencimento(grupoId, data);
              if (r.erro) setErro(r.erro);
              else setAberto(false);
            })
          }
          className="bg-content px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="btn-sec">
          Cancelar
        </button>
      </div>
      {erro && <p className="text-[12px] text-content/80">{erro}</p>}
    </div>
  );
}
