"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePassword, type ChangePasswordState } from "@/lib/admin/users";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  useEffect(() => {
    // No error after a submit means it succeeded (the action returns {} on
    // success) — refresh so the layout re-reads the cleared metadata flag.
    if (state === initialState) return;
    if (!state.error) router.refresh();
  }, [state, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">
        Defina sua senha
      </h1>
      <p className="mt-3 max-w-xs text-sm text-content/50">
        Primeiro acesso — escolha uma senha definitiva antes de continuar.
      </p>

      <form action={formAction} className="mt-8 flex w-full max-w-xs flex-col gap-4">
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
          className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}
