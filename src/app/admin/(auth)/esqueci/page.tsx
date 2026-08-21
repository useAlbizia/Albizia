"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Symbol } from "@/components/logo/Symbol";
import { requestPasswordReset, type ResetState } from "../actions";

const initial: ResetState = {};

export default function EsqueciSenhaPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-content">
      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Recuperar acesso</h1>

      {state.ok ? (
        <p className="mt-8 max-w-xs text-center text-sm leading-relaxed text-content/60">
          Se este e-mail tiver uma conta, enviamos um link para redefinir a senha. Verifique sua
          caixa de entrada.
        </p>
      ) : (
        <form action={action} className="mt-10 flex w-full max-w-xs flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="Seu e-mail"
            required
            className="border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
          >
            {pending ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}

      <Link
        href="/admin/login"
        className="mt-8 text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
      >
        Voltar ao login
      </Link>
    </div>
  );
}
