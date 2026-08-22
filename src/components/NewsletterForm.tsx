"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/lib/newsletter";

const initial: SubscribeState = {};

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, initial);

  if (state.ok) {
    return (
      <p className="text-[13px] leading-relaxed text-content/60">
        Obrigado — você está na lista. Em breve, novidades da ALBIZIA.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Newsletter</p>
      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="Seu e-mail"
          className="min-w-0 flex-1 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
        />
        <button
          type="submit"
          disabled={pending}
          className="border border-content px-4 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "..." : "Assinar"}
        </button>
      </div>
      {state.error && <p className="text-[12px] text-content/60">{state.error}</p>}
    </form>
  );
}
