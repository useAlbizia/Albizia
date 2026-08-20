"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function CarrinhoPage() {
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

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="mb-12 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Carrinho
      </h1>

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
              <p className="text-sm text-content/70">
                {(item.price * item.quantity).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
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
        <p className="text-sm uppercase tracking-[0.15em] text-content/60">Total</p>
        <p className="text-lg">
          {totalPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
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
