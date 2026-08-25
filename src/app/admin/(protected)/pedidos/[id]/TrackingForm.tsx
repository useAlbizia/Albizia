"use client";

import { useActionState } from "react";
import { saveTracking, type TrackingState } from "../_actions";

const initial: TrackingState = {};

export function TrackingForm({
  orderId,
  currentCode,
}: {
  orderId: string;
  currentCode: string | null;
}) {
  const action = saveTracking.bind(null, orderId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        name="trackingCode"
        defaultValue={currentCode ?? ""}
        placeholder="Código de rastreio"
        className="flex-1 border border-content/30 bg-transparent px-4 py-2 text-sm outline-none focus:border-content"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Enviando..." : currentCode ? "Atualizar" : "Salvar e notificar"}
      </button>
      {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
      {state.ok && <span className="text-[12px] text-content/50">Cliente notificado ✓</span>}
    </form>
  );
}
