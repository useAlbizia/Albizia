"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/lib/newsletter";

const initial: SubscribeState = {};

// No rodapé esta coluna é estreita. Campo e botão lado a lado cortavam o
// placeholder ("Seu e-m..."), então vão empilhados: cada um usa a largura
// inteira e nada fica truncado, em qualquer tamanho de tela.
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, initial);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Newsletter</p>
        <p className="text-[13px] leading-relaxed text-content/60">
          Obrigado, você está na lista. Em breve, novidades da ALBIZIA.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Newsletter</p>
      <p className="text-[12px] leading-relaxed text-content/40">
        Lançamentos e coleções em primeira mão. Sem excessos.
      </p>

      <input
        name="email"
        type="email"
        required
        placeholder="Seu e-mail"
        aria-label="Seu e-mail"
        className="w-full border border-content/30 bg-transparent px-3 py-2.5 text-sm outline-none transition-colors focus:border-content"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full border border-content py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Assinar"}
      </button>

      {state.error && <p className="text-[12px] text-content/60">{state.error}</p>}
    </form>
  );
}
