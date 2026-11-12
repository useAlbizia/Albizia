"use client";

import { useActionState } from "react";
import { createCoupon, type CouponState } from "./_actions";

const initial: CouponState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, initial);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-3">
      <input name="code" placeholder="Código (ex: BEMVINDO10)" required className={`${input} uppercase`} />

      <div className="grid grid-cols-2 gap-3">
        <select name="type" defaultValue="percent" className={input}>
          <option value="percent">Percentual (%)</option>
          <option value="fixed">Valor fixo (R$)</option>
        </select>
        <input
          name="value"
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor (10 = 10% ou R$10)"
          required
          className={input}
        />
      </div>

      <input
        name="minSubtotal"
        type="number"
        step="0.01"
        min="0"
        placeholder="Compra mínima em R$ (opcional)"
        className={input}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px]">
          Limite total de usos (opcional)
          <input name="maxUses" type="number" step="1" min="1" placeholder="Ex.: 10" className={input} />
          <span className="text-[12px] leading-snug text-content/60">
            Quantos pedidos pagos podem usar o cupom, somando todos os clientes. 10 = os 10 primeiros que comprarem.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[13px]">
          Válido até (opcional)
          <input name="expiresAt" type="date" className={input} />
          <span className="text-[12px] leading-snug text-content/60">Vale até 23h59 desse dia. No dia seguinte, deixa de valer sozinho.</span>
        </label>
      </div>
      <label className="flex items-start gap-3 text-[14px]">
        <input type="checkbox" name="umaVezPorCliente" className="mt-1 h-5 w-5 accent-content" />
        <span>
          <strong>Uma vez por cliente</strong>
          <span className="block text-[12px] text-content/60">
            Cada e-mail ou CPF usa só uma vez. Ideal para cupom de boas-vindas.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Criando..." : "Criar cupom"}
        </button>
        {state.error && <span className="text-[13px] text-content/70">{state.error}</span>}
        {state.ok && <span className="text-[13px] text-content/50">Cupom criado ✓</span>}
      </div>
    </form>
  );
}
