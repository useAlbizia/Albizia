import { getOrderForTracking } from "@/lib/orders";

export const metadata = { title: "Acompanhar pedido — ALBIZIA" };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export default async function AcompanharPage(props: PageProps<"/acompanhar">) {
  const sp = await props.searchParams;
  const numero = one(sp.numero);
  const email = one(sp.email);

  const searched = !!numero && !!email;
  const order = searched ? await getOrderForTracking(Number(numero), email) : null;

  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Acompanhar pedido
      </h1>

      <form className="flex flex-col gap-3 sm:flex-row">
        <input
          name="numero"
          defaultValue={numero}
          inputMode="numeric"
          placeholder="Número do pedido"
          required
          className={`${input} sm:w-40`}
        />
        <input
          name="email"
          type="email"
          defaultValue={email}
          placeholder="E-mail da compra"
          required
          className={`${input} flex-1`}
        />
        <button
          type="submit"
          className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
        >
          Buscar
        </button>
      </form>

      {searched && !order && (
        <p className="mt-10 text-center text-sm text-content/50">
          Nenhum pedido encontrado com esse número e e-mail. Confira os dados e tente novamente.
        </p>
      )}

      {order && (
        <div className="mt-12">
          <div className="flex items-baseline justify-between border-b border-content/10 pb-4">
            <span className="text-lg">Pedido #{order.orderNumber}</span>
            <span className="text-[12px] text-content/50">
              {new Date(order.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-content/50">Status</p>
          <p className="mt-1 text-xl">{order.statusLabel}</p>

          {order.trackingCode && (
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">
                Código de rastreio
              </p>
              <p className="mt-1 font-mono text-sm">{order.trackingCode}</p>
            </div>
          )}

          <div className="mt-8 divide-y divide-content/10 border-y border-content/10">
            {order.items.map((i, idx) => (
              <div key={idx} className="flex justify-between py-3 text-sm">
                <span className="text-content/70">
                  {i.productName} ({i.size}) × {i.quantity}
                </span>
                <span className="text-content/60">{money(i.unitPriceCents * i.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-content/60">
              <span>Subtotal</span>
              <span>{money(order.subtotalCents)}</span>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-content/60">
                <span>Desconto{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>−{money(order.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-content/60">
              <span>Frete</span>
              <span>{order.shippingCents === 0 ? "Grátis" : money(order.shippingCents)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-content/10 pt-2">
              <span className="uppercase tracking-[0.15em] text-content/60">Total</span>
              <span className="text-lg">{money(order.totalCents)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
