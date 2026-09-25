"use client";

import { useActionState } from "react";
import { saveRecoverySettings, type RecoverySettingsState } from "./_actions";

const initial: RecoverySettingsState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";
const label = "text-[11px] uppercase tracking-[0.2em] text-content/50";

export type RecoveryFormSettings = {
  minutes: number;
  highValueReais: string;
  alertEmail: string;
};

export function RecoverySettingsForm({ settings }: { settings: RecoveryFormSettings }) {
  const [state, action, pending] = useActionState(saveRecoverySettings, initial);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <span className={label}>Regras da recuperação</span>

      <div className="flex flex-col gap-1">
        <input
          name="minutes"
          type="number"
          min="5"
          max="10080"
          defaultValue={settings.minutes}
          className={input}
        />
        <p className="text-[11px] text-content/40">
          Minutos parados até o pedido entrar na fila. Abaixo disso o cliente provavelmente ainda
          está pagando.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <input
          name="highValue"
          type="number"
          step="0.01"
          min="0"
          defaultValue={settings.highValueReais}
          className={input}
        />
        <p className="text-[11px] text-content/40">
          Valor em R$ a partir do qual o pedido é marcado como alto valor e sobe para o topo da fila.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <input
          name="alertEmail"
          type="email"
          defaultValue={settings.alertEmail}
          placeholder="E-mail para receber o alerta (opcional)"
          className={input}
        />
        <p className="text-[11px] text-content/40">
          Quem é avisado quando um pedido de alto valor fica parado. Deixe em branco para não
          receber alerta.
        </p>
      </div>

      <div className="mt-1 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar regras"}
        </button>
        {state.ok && <span className="text-[13px] text-content/50">Salvo ✓</span>}
        {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
      </div>
    </form>
  );
}
