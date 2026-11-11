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
      {/* Um embaixo do outro: lado a lado, a caixa não encolhia e empurrava o
          botão para cima do endereço de entrega, na coluna ao lado. */}
      <div className="flex min-w-0 flex-col gap-2">
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          autoComplete="off"
          className="w-full min-w-0 border border-content/40 bg-transparent px-3 py-2 text-[16px] outline-none focus:border-content sm:text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn-sec self-start"
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
