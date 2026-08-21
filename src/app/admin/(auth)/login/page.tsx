"use client";

import { useActionState } from "react";
import { Symbol } from "@/components/logo/Symbol";
import { login, type LoginState } from "../actions";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-content">
      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Admin</h1>

      <form action={formAction} className="mt-10 flex w-full max-w-xs flex-col gap-4">
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          autoComplete="username"
          className="border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content"
        />
        <input
          name="password"
          type="password"
          placeholder="Senha"
          required
          autoComplete="current-password"
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
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <a
          href="/admin/esqueci"
          className="text-center text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
        >
          Esqueci a senha
        </a>
      </form>
    </div>
  );
}
