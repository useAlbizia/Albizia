"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useCart } from "@/lib/cart-context";
import { createOrder, type CheckoutState } from "@/lib/checkout/actions";
import { track } from "@/lib/analytics-client";
import { computeShipping, type ShippingConfig } from "@/lib/shipping-calc";

const initialState: CheckoutState = {};

const inputClass =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutClient({ shipping }: { shipping: ShippingConfig }) {
  const { items, totalPrice } = useCart();
  const action = createOrder.bind(null, items);
  const [state, formAction, pending] = useActionState(action, initialState);

  const hasItems = items.length > 0;
  useEffect(() => {
    if (hasItems) track({ type: "checkout_start" });
  }, [hasItems]);

  if (items.length === 0) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-28 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-content/50">
          Seu carrinho está vazio
        </p>
        <Link
          href="/colecoes"
          className="mt-8 border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
        >
          Ver coleções
        </Link>
      </section>
    );
  }

  const subtotalCents = Math.round(totalPrice * 100);
  const shippingCents = computeShipping(subtotalCents, shipping);
  const totalCents = subtotalCents + shippingCents;

  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Checkout
      </h1>

      <div className="divide-y divide-content/10 border-y border-content/10">
        {items.map((item) => (
          <div key={`${item.slug}-${item.size}`} className="flex justify-between py-4 text-sm">
            <span className="text-content/70">
              {item.name} ({item.size}) × {item.quantity}
            </span>
            <span>{money(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-content/60">
          <span>Subtotal</span>
          <span>{money(subtotalCents / 100)}</span>
        </div>
        <div className="flex justify-between text-content/60">
          <span>Frete</span>
          <span>{shippingCents === 0 ? "Grátis" : money(shippingCents / 100)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-content/10 pt-3">
          <span className="uppercase tracking-[0.15em] text-content/60">Total</span>
          <span className="text-lg">{money(totalCents / 100)}</span>
        </div>
      </div>

      <form action={formAction} className="mt-10 flex flex-col gap-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Seus dados</p>
        <input name="name" placeholder="Nome completo" required className={inputClass} />
        <input name="email" type="email" placeholder="E-mail" required className={inputClass} />
        <input name="phone" placeholder="Telefone" required className={inputClass} />

        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Entrega</p>
        <div className="grid grid-cols-3 gap-3">
          <input name="street" placeholder="Endereço" required className={`${inputClass} col-span-2`} />
          <input name="number" placeholder="Número" required className={inputClass} />
        </div>
        <input name="complement" placeholder="Complemento (opcional)" className={inputClass} />
        <input name="neighborhood" placeholder="Bairro" required className={inputClass} />
        <div className="grid grid-cols-3 gap-3">
          <input name="city" placeholder="Cidade" required className={`${inputClass} col-span-2`} />
          <input name="state" placeholder="UF" maxLength={2} required className={inputClass} />
        </div>
        <input name="zip" placeholder="CEP" required className={inputClass} />

        {state.error && (
          <p className="text-[13px] text-content/70" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full border border-content py-4 text-[13px] uppercase tracking-[0.2em] text-content transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Redirecionando..." : "Ir para pagamento"}
        </button>

        <p className="text-center text-[11px] text-content/40">
          Você será redirecionado ao Mercado Pago (Pix ou cartão) para concluir o pagamento.
        </p>
      </form>
    </section>
  );
}
