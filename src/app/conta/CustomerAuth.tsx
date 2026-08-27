"use client";

import { useActionState, useState } from "react";
import {
  customerSignIn,
  customerSignUp,
  customerRequestPasswordReset,
  type AuthState,
} from "@/lib/customer/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";

const initial: AuthState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function CustomerAuth() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [inState, inAction, inPending] = useActionState(customerSignIn, initial);
  const [upState, upAction, upPending] = useActionState(customerSignUp, initial);
  const [fgState, fgAction, fgPending] = useActionState(customerRequestPasswordReset, initial);

  async function google() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/conta` },
    });
  }

  const state = mode === "login" ? inState : mode === "signup" ? upState : fgState;

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
          <button
            type="button"
            onClick={google}
            className="flex w-full items-center justify-center gap-3 border border-content/30 py-3 text-[13px] uppercase tracking-[0.15em] transition-colors hover:border-content"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.3 17.6 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7C43.9 37.9 46.5 31.8 46.5 24.5z" />
              <path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.7 2.2-8.5 2.2-6.4 0-11.8-3.8-13.7-9.1l-7.8 6.1C6.4 42.6 14.6 48 24 48z" />
            </svg>
            Entrar com Google
          </button>

          <div className="my-6 flex items-center gap-4 text-[11px] uppercase tracking-[0.2em] text-content/30">
            <span className="h-px flex-1 bg-content/10" /> ou <span className="h-px flex-1 bg-content/10" />
          </div>

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
