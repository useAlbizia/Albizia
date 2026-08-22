"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Symbol } from "@/components/logo/Symbol";
import { useCart } from "@/lib/cart-context";

export default function ConfirmacaoPage() {
  const { clear } = useCart();

  useEffect(() => {
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">
        Pedido recebido
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-content/60">
        Assim que o pagamento for confirmado pelo Mercado Pago, você recebe a atualização por
        e-mail. Você também pode acompanhar o status a qualquer momento.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/acompanhar"
          className="border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
        >
          Acompanhar pedido
        </Link>
        <Link
          href="/colecoes"
          className="border border-content/30 px-8 py-3 text-[13px] uppercase tracking-[0.2em] text-content/70 transition-colors hover:border-content hover:text-content"
        >
          Continuar navegando
        </Link>
      </div>
    </section>
  );
}
