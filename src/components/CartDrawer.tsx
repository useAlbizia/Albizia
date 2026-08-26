"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CartDrawer() {
  const { items, isOpen, closeCart, setQuantity, removeItem, totalPrice, totalCount } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeCart}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.35 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface text-content shadow-2xl"
            role="dialog"
            aria-label="Carrinho"
          >
            <div className="flex items-center justify-between border-b border-content/10 px-6 py-5">
              <span className="text-[13px] uppercase tracking-[0.25em]">
                Carrinho{totalCount > 0 ? ` · ${totalCount}` : ""}
              </span>
              <button
                onClick={closeCart}
                aria-label="Fechar"
                className="text-content/50 transition-colors hover:text-content"
              >
                ✕
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-content/50">
                  Seu carrinho está vazio
                </p>
                <button
                  onClick={closeCart}
                  className="border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
                >
                  Continuar comprando
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 divide-y divide-content/10 overflow-y-auto px-6">
                  {items.map((item) => (
                    <div key={`${item.slug}-${item.size}`} className="flex gap-4 py-5">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- cart thumbnail
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-20 w-16 shrink-0 object-cover ring-1 ring-content/10"
                        />
                      ) : (
                        <div className="flex h-20 w-16 shrink-0 items-center justify-center bg-content/5 text-[8px] uppercase tracking-wider text-content/30 ring-1 ring-content/10">
                          ALBIZIA
                        </div>
                      )}

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] uppercase tracking-[0.05em]">{item.name}</p>
                            <button
                              onClick={() => removeItem(item.slug, item.size)}
                              aria-label={`Remover ${item.name}`}
                              className="text-content/40 transition-colors hover:text-content"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-content/40">
                            Tam. {item.size}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center border border-content/20">
                            <button
                              onClick={() => setQuantity(item.slug, item.size, item.quantity - 1)}
                              aria-label="Diminuir"
                              className="px-2.5 py-1 text-content/60 transition-colors hover:text-content"
                            >
                              −
                            </button>
                            <span className="min-w-[2ch] text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => setQuantity(item.slug, item.size, item.quantity + 1)}
                              aria-label="Aumentar"
                              className="px-2.5 py-1 text-content/60 transition-colors hover:text-content"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm text-content/70">
                            {money(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-content/10 px-6 py-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[12px] uppercase tracking-[0.15em] text-content/60">
                      Subtotal
                    </span>
                    <span className="text-lg">{money(totalPrice)}</span>
                  </div>
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="block w-full border border-content bg-content py-3.5 text-center text-[13px] uppercase tracking-[0.2em] text-surface transition-opacity hover:opacity-90"
                  >
                    Finalizar compra
                  </Link>
                  <Link
                    href="/carrinho"
                    onClick={closeCart}
                    className="mt-2 block w-full py-2 text-center text-[12px] uppercase tracking-[0.15em] text-content/50 transition-colors hover:text-content"
                  >
                    Ver carrinho
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
