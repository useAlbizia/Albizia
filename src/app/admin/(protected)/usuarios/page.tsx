"use client";

import { useActionState, useState } from "react";
import { createAdminUser, type CreateAdminState } from "@/lib/admin/users";

const initialState: CreateAdminState = {};

export default function UsuariosPage() {
  const [state, formAction, pending] = useActionState(createAdminUser, initialState);
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">
        Criar novo acesso
      </h1>

      {state.success ? (
        <div className="max-w-md border border-content/20 bg-surface-soft p-6">
          <p className="text-sm text-content/70">
            Conta criada para <strong className="text-content">{state.success.email}</strong>.
            Envie essa senha temporária pela pessoa — ela será obrigada a trocar no primeiro
            login.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 break-all border border-content/20 bg-surface px-3 py-2 text-sm">
              {state.success.password}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(state.success!.password);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="border border-content/30 px-3 py-2 text-[12px] uppercase tracking-[0.1em] hover:border-content"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-content/40">
            Essa senha só aparece uma vez — não fica salva em nenhum lugar visível.
          </p>
        </div>
      ) : (
        <form action={formAction} className="flex max-w-md flex-col gap-4">
          <input
            name="email"
            type="email"
            placeholder="E-mail do novo admin"
            required
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
            {pending ? "Criando..." : "Criar acesso"}
          </button>
        </form>
      )}
    </div>
  );
}
