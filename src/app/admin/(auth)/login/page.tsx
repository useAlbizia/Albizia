"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Symbol } from "@/components/logo/Symbol";
import { CampoSenha } from "@/components/auth/CampoSenha";
import { login, type LoginState } from "../actions";

const initialState: LoginState = {};
const input = "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

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
          autoCapitalize="none"
          defaultValue={state.email}
          // A chave muda a cada resposta, para o campo receber o e-mail devolvido.
          key={state.email ?? "vazio"}
          className={input}
        />
        <CampoSenha name="password" placeholder="Senha" autoComplete="current-password" className={input} />

        {state.error && (
          <div className="border border-content/25 px-4 py-3 text-[13px] leading-relaxed text-content/80" role="alert">
            <p>{state.error}</p>
            {state.sugerirRecuperar && (
              // O atalho fica dentro do próprio aviso: é ali que o olho está
              // quando a senha não entra, e no celular o link de baixo pode
              // ficar escondido atrás do teclado.
              <Link href="/admin/esqueci" className="mt-2 inline-block underline underline-offset-4">
                Criar uma nova senha
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <Link
          href="/admin/esqueci"
          className="block py-3 text-center text-[12px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
        >
          Esqueci a senha
        </Link>
      </form>
    </div>
  );
}
