"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CartItem } from "@/lib/cart-context";

// Resumo do pedido sempre à vista.
//
// No desktop ele gruda na lateral: a pessoa preenche endereço sem perder de
// vista o que está comprando e quanto vai pagar.
// No celular não há lateral, então vira uma barra no topo que mostra o total
// e abre com um toque. Esconder o total atrás de um scroll é um jeito
// conhecido de aumentar abandono.

function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type SummaryProps = {
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string;
  shippingCents: number | null;
  awaitingCep: boolean;
  totalCents: number;
  couponInput: string;
  onCouponInput: (v: string) => void;
  onApplyCoupon: () => void;
  couponPending: boolean;
  couponMsg: string | null;
};

function Linhas({ items }: { items: CartItem[] }) {
  return (
    <div className="divide-y divide-content/10">
      {items.map((item) => (
        <div key={`${item.slug}-${item.size}`} className="flex justify-between gap-3 py-3 text-[13px]">
          <span className="text-content/70">
            {item.name} <span className="text-content/40">({item.size})</span>
            {item.quantity > 1 ? ` × ${item.quantity}` : ""}
          </span>
          <span className="shrink-0">{money(Math.round(item.price * 100) * item.quantity)}</span>
        </div>
      ))}
    </div>
  );
}

function Valores({
  subtotalCents,
  discountCents,
  couponCode,
  shippingCents,
  awaitingCep,
  totalCents,
}: Pick<
  SummaryProps,
  "subtotalCents" | "discountCents" | "couponCode" | "shippingCents" | "awaitingCep" | "totalCents"
>) {
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      <div className="flex justify-between text-content/60">
        <span>Subtotal</span>
        <span>{money(subtotalCents)}</span>
      </div>
      {discountCents > 0 && (
        <div className="flex justify-between text-content/60">
          <span>Desconto{couponCode ? ` (${couponCode})` : ""}</span>
          <span>−{money(discountCents)}</span>
        </div>
      )}
      <div className="flex justify-between text-content/60">
        <span>Frete</span>
        <span>
          {awaitingCep && shippingCents === null
            ? "Calcule pelo CEP"
            : shippingCents === 0
              ? "Grátis"
              : money(shippingCents ?? 0)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-content/10 pt-3">
        <span className="text-[12px] uppercase tracking-[0.15em] text-content/60">Total</span>
        <span className="text-lg">{money(totalCents)}</span>
      </div>
    </div>
  );
}

function Cupom({
  couponInput,
  onCouponInput,
  onApplyCoupon,
  couponPending,
  couponMsg,
}: Pick<SummaryProps, "couponInput" | "onCouponInput" | "onApplyCoupon" | "couponPending" | "couponMsg">) {
  return (
    <div className="mt-5">
      <div className="flex gap-2">
        <input
          value={couponInput}
          onChange={(e) => onCouponInput(e.target.value)}
          placeholder="Cupom"
          aria-label="Cupom de desconto"
          className="min-w-0 flex-1 border border-content/30 bg-transparent px-3 py-2.5 text-[13px] uppercase outline-none focus:border-content"
        />
        <button
          type="button"
          onClick={onApplyCoupon}
          disabled={couponPending || !couponInput.trim()}
          className="shrink-0 border border-content px-4 text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
        >
          {couponPending ? "..." : "Aplicar"}
        </button>
      </div>
      {couponMsg && <p className="mt-2 text-[12px] text-content/50">{couponMsg}</p>}
    </div>
  );
}

export function OrderSummary(props: SummaryProps) {
  const [abertoNoMobile, setAbertoNoMobile] = useState(false);
  const qtd = props.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Celular: barra que abre. O total fica sempre visível na barra. */}
      <div className="border border-content/10 lg:hidden">
        <button
          type="button"
          onClick={() => setAbertoNoMobile((v) => !v)}
          aria-expanded={abertoNoMobile}
          className="flex w-full items-center justify-between px-4 py-3.5"
        >
          <span className="flex items-center gap-2 text-[12px] uppercase tracking-[0.15em] text-content/60">
            Resumo
            <span className="text-content/35">
              ({qtd} {qtd === 1 ? "item" : "itens"})
            </span>
            <span
              className={`text-content/40 transition-transform duration-200 ${abertoNoMobile ? "rotate-45" : ""}`}
            >
              +
            </span>
          </span>
          <span className="text-base">{money(props.totalCents)}</span>
        </button>

        <AnimatePresence initial={false}>
          {abertoNoMobile && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-content/10 px-4 pb-5 pt-1">
                <Linhas items={props.items} />
                <div className="mt-4">
                  <Valores {...props} />
                </div>
                <Cupom {...props} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: gruda na lateral enquanto a pessoa preenche o formulário. */}
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        <div className="border border-content/10 p-5">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">
            Resumo do pedido
          </p>
          <Linhas items={props.items} />
          <div className="mt-4">
            <Valores {...props} />
          </div>
          <Cupom {...props} />
        </div>
      </aside>
    </>
  );
}
