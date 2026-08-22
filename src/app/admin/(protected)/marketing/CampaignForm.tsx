"use client";

import { useActionState } from "react";
import { sendCampaign, type CampaignState } from "./_actions";

const initial: CampaignState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function CampaignForm({ activeCount }: { activeCount: number }) {
  const [state, action, pending] = useActionState(sendCampaign, initial);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-3">
      <input name="subject" placeholder="Assunto do e-mail" required className={input} />
      <textarea
        name="body"
        placeholder="Escreva sua mensagem... (linhas em branco separam parágrafos)"
        rows={10}
        required
        className={input}
      />
      {state.error && <p className="text-[13px] text-content/70">{state.error}</p>}
      {state.ok && (
        <p className="text-[13px] text-content/60">
          Campanha registrada. Enviados: {state.sent} de {activeCount} inscritos.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Enviando..." : `Enviar para ${activeCount} inscritos`}
      </button>
    </form>
  );
}
