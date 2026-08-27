"use client";

import { useActionState } from "react";
import { customerSetNewPassword, type NewPasswordState } from "@/lib/customer/actions";

const initial: NewPasswordState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState(customerSetNewPassword, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="password"
        type="password"
        placeholder="Nova senha"
        required
        minLength={8}
        autoComplete="new-password"
        className={input}
      />
      <input
        name="confirm"
        type="password"
        placeholder="Confirmar nova senha"
        required
        minLength={8}
        autoComplete="new-password"
        className={input}
      />
      {state.error && (
        <p className="text-[13px] text-content/70" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
