"use client";

import { useActionState } from "react";
import { abrirChamado, type AberturaState } from "@/lib/atendimento-actions";

// Os assuntos repetem lib/chamados.ts (o servidor confere de novo).
const MOTIVOS: [string, string][] = [
  ["produto", "Problema com a peça (defeito, avaria ou peça errada)"],
  ["troca", "Troca ou devolução"],
  ["entrega", "Entrega (atraso, extravio ou endereço)"],
  ["pagamento", "Pagamento ou reembolso"],
  ["outro", "Outro assunto"],
];

export type InicialAtendimento = { motivo?: string; mensagem?: string; pedido?: string };

/**
 * Formulário de protocolo, usado na página /atendimento e dentro do chat
 * (compacto, já preenchido com o que a Albi entendeu da conversa).
 */
export function FormAtendimento({
  compacto = false,
  inicial,
  conversa = "",
  origem = "site",
}: {
  compacto?: boolean;
  inicial?: InicialAtendimento;
  conversa?: string;
  origem?: "site" | "chat";
}) {
  const [state, action, pending] = useActionState<AberturaState, FormData>(abrirChamado, {});

  if (state.ok) {
    return (
      <div className={`border border-content/15 bg-surface-soft ${compacto ? "p-4" : "p-6"}`} role="status">
        <p className="text-[11px] uppercase tracking-[0.25em] text-content/50">Protocolo aberto</p>
        <p className={`${compacto ? "mt-2 text-lg" : "mt-3 text-2xl"} tracking-wide`}>nº {state.numero}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Enviamos uma cópia para o seu e-mail. Nossa equipe responde até {state.prazo}. Se quiser mandar fotos ou mais
          detalhes, é só responder aquele e-mail.
        </p>
      </div>
    );
  }

  const erro = (campo: string) =>
    !state.ok && state.campos?.[campo] ? <p className="mt-1 text-[11px] text-red-700">{state.campos[campo]}</p> : null;
  const v: Record<string, string | undefined> = (!state.ok && state.valores) || {};
  const campo = "w-full border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";
  const rotulo = "mb-1 block text-[11px] uppercase tracking-[0.15em] text-content/60";

  return (
    <form action={action} className={compacto ? "space-y-2.5" : "space-y-4"} noValidate>
      {/* Armadilha para robô: invisível para gente. */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <input type="hidden" name="origem" value={origem} />
      <input type="hidden" name="conversa" value={conversa} />

      <div className={compacto ? "space-y-2.5" : "grid gap-4 sm:grid-cols-2"}>
        <label className="block">
          <span className={rotulo}>Nome</span>
          <input name="nome" required autoComplete="name" defaultValue={v.nome} className={campo} />
          {erro("nome")}
        </label>
        <label className="block">
          <span className={rotulo}>E-mail</span>
          <input name="email" type="email" defaultValue={v.email} required autoComplete="email" inputMode="email" className={campo} />
          {erro("email")}
        </label>
        <label className="block">
          <span className={rotulo}>Telefone (opcional)</span>
          <input name="telefone" type="tel" defaultValue={v.telefone} autoComplete="tel" inputMode="tel" className={campo} />
        </label>
        <label className="block">
          <span className={rotulo}>Nº do pedido (se tiver)</span>
          <input name="pedido" inputMode="numeric" defaultValue={v.pedido ?? inicial?.pedido ?? ""} className={campo} />
        </label>
      </div>

      <label className="block">
        <span className={rotulo}>Assunto</span>
        <select name="motivo" defaultValue={v.motivo ?? inicial?.motivo ?? ""} required className={`${campo} bg-surface`}>
          <option value="" disabled>
            Escolha
          </option>
          {MOTIVOS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {erro("motivo")}
      </label>

      <label className="block">
        <span className={rotulo}>O que aconteceu</span>
        <textarea
          name="mensagem"
          required
          rows={compacto ? 4 : 6}
          defaultValue={v.mensagem ?? inicial?.mensagem ?? ""}
          className={`${campo} resize-y`}
        />
        {erro("mensagem")}
      </label>

      {!state.ok && state.error && <p className="text-[12px] text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-content px-4 py-3 text-[12px] uppercase tracking-[0.2em] text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Abrir protocolo"}
      </button>
    </form>
  );
}
