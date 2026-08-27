"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useCart } from "@/lib/cart-context";
import { createOrder, applyCoupon, quoteFreteAction, type CheckoutState } from "@/lib/checkout/actions";
import { track } from "@/lib/analytics-client";
import { computeShipping, type ShippingConfig } from "@/lib/shipping-calc";

const initialState: CheckoutState = {};

const inputClass =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutClient({
  method,
  shipping,
}: {
  method: "flat" | "melhor_envio";
  shipping: ShippingConfig;
}) {
  const { items, totalPrice } = useCart();
  const action = createOrder.bind(null, items);
  const [state, formAction, pending] = useActionState(action, initialState);

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponPending, startCoupon] = useTransition();

  const [zip, setZip] = useState("");
  const [quotedCents, setQuotedCents] = useState<number | null>(null);
  const [fretePending, startFrete] = useTransition();

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
  const isME = method === "melhor_envio";
  // Flat: computed instantly. Melhor Envio: null until the customer quotes a CEP.
  const shippingCents = isME ? quotedCents : computeShipping(subtotalCents, shipping);
  const effectiveDiscount = Math.min(discountCents, subtotalCents);
  const totalCents = subtotalCents - effectiveDiscount + (shippingCents ?? 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  function calcFrete() {
    startFrete(async () => {
      const r = await quoteFreteAction(zip, subtotalCents, totalQty);
      setQuotedCents(r.cents);
    });
  }

  function handleApply() {
    startCoupon(async () => {
      const r = await applyCoupon(couponInput, subtotalCents);
      if (r.ok) {
        setDiscountCents(r.discountCents);
        setCouponCode(r.code);
        setCouponMsg(`${r.code}: ${money(r.discountCents / 100)} de desconto`);
      } else {
        setDiscountCents(0);
        setCouponCode("");
        setCouponMsg(r.message);
      }
    });
  }

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

      {/* Coupon */}
      <div className="mt-6 flex gap-2">
        <input
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value)}
          placeholder="Cupom de desconto"
          className={`${inputClass} flex-1 uppercase`}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={couponPending || !couponInput.trim()}
          className="border border-content px-5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
        >
          {couponPending ? "..." : "Aplicar"}
        </button>
      </div>
      {couponMsg && <p className="mt-2 text-[12px] text-content/50">{couponMsg}</p>}

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-content/60">
          <span>Subtotal</span>
          <span>{money(subtotalCents / 100)}</span>
        </div>
        {effectiveDiscount > 0 && (
          <div className="flex justify-between text-content/60">
            <span>Desconto{couponCode ? ` (${couponCode})` : ""}</span>
            <span>−{money(effectiveDiscount / 100)}</span>
          </div>
        )}
        <div className="flex justify-between text-content/60">
          <span>Frete</span>
          <span>
            {isME && shippingCents === null
              ? "Calcule pelo CEP"
              : shippingCents === 0
                ? "Grátis"
                : money((shippingCents ?? 0) / 100)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-content/10 pt-3">
          <span className="uppercase tracking-[0.15em] text-content/60">Total</span>
          <span className="text-lg">{money(totalCents / 100)}</span>
        </div>
      </div>

      <form action={formAction} className="mt-10 flex flex-col gap-4">
        <input type="hidden" name="couponCode" value={couponCode} />
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
        <div className="flex gap-2">
          <input
            name="zip"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              setQuotedCents(null);
            }}
            placeholder="CEP"
            required
            className={`${inputClass} flex-1`}
          />
          {isME && (
            <button
              type="button"
              onClick={calcFrete}
              disabled={fretePending || zip.replace(/\D/g, "").length !== 8}
              className="shrink-0 border border-content px-4 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
            >
              {fretePending ? "..." : "Calcular frete"}
            </button>
          )}
        </div>

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
