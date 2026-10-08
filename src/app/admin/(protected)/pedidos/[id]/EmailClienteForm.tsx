"use client";

import { useActionState } from "react";
import { corrigirEmailAdmin, type EmailFixState } from "../_actions";

const vazio: EmailFixState = {};

// Correção do e-mail do cliente pelo painel. Para o caso de quem digitou o
// endereço errado, pagou, não recebeu nada e ligou com o número do pedido.
export function EmailClienteForm({ orderId, email, pago }: { orderId: string; email: string; pago: boolean }) {
  const [state, action, pending] = useActionState(corrigirEmailAdmin.bind(null, orderId), vazio);

  return (
    <form action={action} className="mt-3 flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          autoComplete="off"
          className="flex-1 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:border-content disabled:opacity-50"
        >
          {pending ? "..." : "Corrigir e-mail"}
        </button>
      </div>
      {pago && (
        <label className="flex items-center gap-2 text-[12px] text-content/55">
          <input type="checkbox" name="reenviar" defaultChecked className="accent-content" />
          Reenviar a confirmação de pagamento para o endereço novo
        </label>
      )}
      {state.error && <p className="text-[12px] text-content/75">{state.error}</p>}
      {state.mensagem && <p className="text-[12px] text-content/55">{state.mensagem}</p>}
    </form>
  );
}
