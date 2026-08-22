"use client";

import { useActionState } from "react";
import { unsubscribe, type UnsubscribeState } from "@/lib/newsletter";

const initial: UnsubscribeState = {};

export function DescadastrarForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(unsubscribe, initial);

  if (state.done) {
    return (
      <p className="mt-8 max-w-sm text-center text-sm leading-relaxed text-content/60">
        Pronto — você não receberá mais nossos e-mails. Sentiremos sua falta.
      </p>
    );
  }

  return (
    <form action={action} className="mt-8 flex flex-col items-center gap-4">
      <input type="hidden" name="email" value={email} />
      <p className="max-w-sm text-center text-sm leading-relaxed text-content/60">
        Deseja parar de receber os e-mails da ALBIZIA{email ? ` em ${email}` : ""}?
      </p>
      <button
        type="submit"
        disabled={pending}
        className="border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "..." : "Cancelar inscrição"}
      </button>
    </form>
  );
}
