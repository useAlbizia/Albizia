"use client";

import { useActionState, useTransition } from "react";
import { anotar, mudarStatus, responder, salvarPrazo, type AcaoState } from "./_actions";
import type { StatusChamado } from "@/lib/chamados";

const campo = "w-full border border-content/30 bg-transparent px-3 py-2 text-[14px] outline-none focus:border-content";

function Aviso({ s, ok }: { s: AcaoState; ok: string }) {
  if (s.error) return <p className="text-[13px] text-red-700">{s.error}</p>;
  if (s.ok) return <p className="text-[13px] text-content/70">{ok}</p>;
  return null;
}

export function FormResposta({ id, nome }: { id: string; nome: string }) {
  const [s, action, pending] = useActionState<AcaoState, FormData>(responder, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-[11px] uppercase tracking-[0.15em] text-content/60" htmlFor="resposta">
        Responder {nome.split(/\s+/)[0]} por e-mail
      </label>
      <textarea id="resposta" name="texto" rows={6} required className={`${campo} resize-y`} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="bg-content px-4 py-2 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50">
          {pending ? "Enviando…" : "Enviar resposta"}
        </button>
        <button type="submit" name="resolver" value="1" disabled={pending} className="btn-sec">
          Enviar e marcar resolvido
        </button>
      </div>
      <Aviso s={s} ok="Resposta enviada para o cliente." />
    </form>
  );
}

export function FormNota({ id }: { id: string }) {
  const [s, action, pending] = useActionState<AcaoState, FormData>(anotar, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-[11px] uppercase tracking-[0.15em] text-content/60" htmlFor="nota">
        Anotação interna (o cliente não vê)
      </label>
      <textarea id="nota" name="texto" rows={2} required className={`${campo} resize-y`} />
      <div>
        <button type="submit" disabled={pending} className="btn-sec">
          {pending ? "Salvando…" : "Salvar anotação"}
        </button>
      </div>
      <Aviso s={s} ok="Anotação salva." />
    </form>
  );
}

export function BotoesStatus({ id, atual }: { id: string; atual: StatusChamado }) {
  const [pending, start] = useTransition();
  const opcoes: [StatusChamado, string][] = [
    ["aberto", "Reabrir"],
    ["andamento", "Em andamento"],
    ["resolvido", "Marcar resolvido"],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes
        .filter(([s]) => s !== atual)
        .map(([s, rotulo]) => (
          <button key={s} type="button" disabled={pending} onClick={() => start(() => mudarStatus(id, s))} className="btn-sec">
            {rotulo}
          </button>
        ))}
    </div>
  );
}

export function FormPrazo({ dias }: { dias: number }) {
  const [s, action, pending] = useActionState<AcaoState, FormData>(salvarPrazo, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2 text-[13px] text-content/70">
      <label htmlFor="dias">Prazo de resposta prometido ao cliente:</label>
      <input id="dias" name="dias" type="number" min={1} max={15} defaultValue={dias} className={`${campo} w-20`} />
      <span>dia(s) útil(eis)</span>
      <button type="submit" disabled={pending} className="btn-sec">
        Salvar
      </button>
      <Aviso s={s} ok="Prazo salvo. Vale para os próximos protocolos." />
    </form>
  );
}
