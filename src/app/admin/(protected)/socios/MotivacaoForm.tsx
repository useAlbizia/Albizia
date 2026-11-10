"use client";

import { useActionState } from "react";
import { enviarMotivacaoAgora, salvarMotivacao, type MotivacaoState } from "./_motivacao";

const vazio: MotivacaoState = {};

export function MotivacaoForm(props: {
  ativa: boolean;
  frequencia: string;
  frequencias: { v: string; label: string }[];
  proximaTitulo: string;
  proximaNumero: number;
  total: number;
  ultimoEnvio: string | null;
  pronta: boolean;
}) {
  const [salvo, salvar, salvando] = useActionState(salvarMotivacao, vazio);
  const [envio, enviar, enviando] = useActionState(enviarMotivacaoAgora, vazio);

  if (!props.pronta) {
    return (
      <p className="text-[13px] leading-relaxed text-content/70">
        Falta aplicar a atualização do banco (npm run db:migrate). Depois disso, o envio aparece aqui.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <form action={salvar} className="flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="ativa" defaultChecked={props.ativa} className="h-4 w-4 accent-content" />
          Enviar automaticamente, às 10h
        </label>
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-content/60">Frequência</span>
          <select
            name="frequencia"
            defaultValue={props.frequencia}
            className="border border-content/30 bg-transparent px-3 py-2 text-[16px] sm:text-sm"
          >
            {props.frequencias.map((f) => (
              <option key={f.v} value={f.v}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.15em] hover:border-content disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          {salvo.ok && <span className="text-[12px] text-content/55">{salvo.ok}</span>}
          {salvo.error && <span className="text-[12px] text-content/80">{salvo.error}</span>}
        </div>
      </form>

      <div className="border-t border-content/10 pt-4 text-[13px] leading-relaxed text-content/65">
        <p>
          Próxima mensagem ({props.proximaNumero} de {props.total}): <strong className="text-content">{props.proximaTitulo}</strong>
        </p>
        <p className="mt-1">
          Último envio: {props.ultimoEnvio ? props.ultimoEnvio.split("-").reverse().join("/") : "nenhum ainda"}
        </p>
      </div>

      <form action={enviar} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando}
          className="bg-content px-4 py-2.5 text-[11px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
        >
          {enviando ? "Enviando..." : "Enviar a próxima agora"}
        </button>
        {envio.ok && <span className="text-[12px] text-content/60">{envio.ok}</span>}
        {envio.error && <span className="text-[12px] text-content/80">{envio.error}</span>}
      </form>
    </div>
  );
}
