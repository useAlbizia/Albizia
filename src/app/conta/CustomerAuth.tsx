"use client";

import { useActionState, useState } from "react";
import {
  customerSignIn,
  customerSignUp,
  customerRequestPasswordReset,
  type AuthState,
} from "@/lib/customer/actions";
import { GoogleSignInButton } from "./GoogleSignInButton";

const initial: AuthState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";
const hasGoogle = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function CustomerAuth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [inState, inAction, inPending] = useActionState(customerSignIn, initial);
  const [upState, upAction, upPending] = useActionState(customerSignUp, initial);
  const [fgState, fgAction, fgPending] = useActionState(customerRequestPasswordReset, initial);

  return (
    <div className="mx-auto w-full max-w-sm">
      {mode !== "forgot" && (
        <div className="mb-8 flex justify-center gap-8 text-[12px] uppercase tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "text-content" : "text-content/40 hover:text-content"}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "text-content" : "text-content/40 hover:text-content"}
          >
            Criar conta
          </button>
        </div>
      )}

      {mode === "forgot" ? (
        <>
          <h2 className="mb-8 text-center text-[12px] uppercase tracking-[0.2em] text-content/60">
            Recuperar senha
          </h2>
          {fgState.info ? (
            <p className="text-center text-sm leading-relaxed text-content/70">{fgState.info}</p>
          ) : (
            <form action={fgAction} className="flex flex-col gap-3">
              <input
                name="email"
                type="email"
                placeholder="Seu e-mail"
                required
                autoComplete="email"
                className={input}
              />
              {fgState.error && (
                <p className="text-[13px] text-content/70">{fgState.error}</p>
              )}
              <button
                type="submit"
                disabled={fgPending}
                className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
              >
                {fgPending ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setMode("login")}
            className="mt-6 block w-full text-center text-[12px] uppercase tracking-[0.15em] text-content/40 hover:text-content"
          >
            Voltar ao login
          </button>
        </>
      ) : (
        <>
          {hasGoogle && (
            <>
              <GoogleSignInButton next="/conta" />
              <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-content/30">
                <span className="h-px flex-1 bg-content/10" /> ou <span className="h-px flex-1 bg-content/10" />
              </div>
            </>
          )}

          {mode === "login" ? (
            <form action={inAction} className="flex flex-col gap-3">
              <input name="email" type="email" placeholder="E-mail" required autoComplete="email" className={input} />
              <input name="password" type="password" placeholder="Senha" required autoComplete="current-password" className={input} />
              {inState.error && <p className="text-[13px] text-content/70">{inState.error}</p>}
              <button
                type="submit"
                disabled={inPending}
                className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
              >
                {inPending ? "Entrando..." : "Entrar"}
              </button>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="mt-1 text-center text-[12px] uppercase tracking-[0.12em] text-content/40 hover:text-content"
              >
                Esqueci minha senha
              </button>
            </form>
          ) : (
            <form action={upAction} className="flex flex-col gap-3">
              <input name="name" placeholder="Nome completo" required autoComplete="name" className={input} />
              <input name="email" type="email" placeholder="E-mail" required autoComplete="email" className={input} />
              <input name="password" type="password" placeholder="Senha (mín. 8 caracteres)" required autoComplete="new-password" className={input} />
              {upState.error && <p className="text-[13px] text-content/70">{upState.error}</p>}
              {upState.info && <p className="text-[13px] text-content/60">{upState.info}</p>}
              <button
                type="submit"
                disabled={upPending}
                className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
              >
                {upPending ? "Criando..." : "Criar conta"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
