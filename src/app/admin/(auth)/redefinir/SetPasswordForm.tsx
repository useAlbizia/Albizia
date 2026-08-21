"use client";

import { useActionState } from "react";
import { setNewPassword, type NewPasswordState } from "./actions";

const initial: NewPasswordState = {};

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, initial);

  return (
    <form action={action} className="mt-10 flex w-full max-w-xs flex-col gap-4">
      <input
        name="password"
        type="password"
        placeholder="Nova senha"
        required
        minLength={8}
        autoComplete="new-password"
        className="border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content"
      />
      <input
        name="confirm"
        type="password"
        placeholder="Confirmar senha"
        required
        minLength={8}
        autoComplete="new-password"
        className="border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content"
      />
      {state.error && (
        <p className="text-[13px] text-content/70" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
