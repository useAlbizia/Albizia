"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { type ShippingConfig } from "@/lib/shipping-calc";

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "Faltam R$X para o frete grátis" — only shown when free shipping is actually
// on offer (flat rate > 0 and a threshold is set). Nudges the ticket up.
function FreeShippingBar({ subtotalCents, shipping }: { subtotalCents: number; shipping: ShippingConfig }) {
  if (shipping.flatCents <= 0 || shipping.freeThresholdCents <= 0) return null;

  const reached = subtotalCents >= shipping.freeThresholdCents;
  const pct = Math.min(100, Math.round((subtotalCents / shipping.freeThresholdCents) * 100));
  const remaining = shipping.freeThresholdCents - subtotalCents;

  return (
    <div className="mb-10">
      <p className="mb-2 text-center text-[12px] tracking-[0.05em] text-content/60">
        {reached ? (
          <>Você ganhou <strong className="text-content">frete grátis</strong>! 🎉</>
        ) : (
          <>Faltam <strong className="text-content">{money(remaining / 100)}</strong> para o frete grátis</>
        )}
      </p>
      <div className="h-1 w-full overflow-hidden bg-content/10">
        <div
          className="h-full bg-content transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CarrinhoClient({ shipping }: { shipping: ShippingConfig }) {
  const { items, removeItem, totalPrice } = useCart();

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

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-12 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Carrinho
      </h1>

      <FreeShippingBar subtotalCents={subtotalCents} shipping={shipping} />

      <div className="divide-y divide-content/10 border-y border-content/10">
        {items.map((item) => (
          <div
            key={`${item.slug}-${item.size}`}
            className="flex items-center justify-between py-6"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.05em]">{item.name}</p>
              <p className="mt-1 text-xs text-content/50">
                Tamanho {item.size} · Qtd {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <p className="text-sm text-content/70">{money(item.price * item.quantity)}</p>
              <button
                onClick={() => removeItem(item.slug, item.size)}
                aria-label={`Remover ${item.name}`}
                className="text-xs uppercase tracking-[0.1em] text-content/40 hover:text-content"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.15em] text-content/60">Subtotal</p>
        <p className="text-lg">{money(totalPrice)}</p>
      </div>

      <Link
        href="/checkout"
        className="mt-10 block w-full border border-content py-4 text-center text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
      >
        Finalizar compra
      </Link>
    </section>
  );
}
