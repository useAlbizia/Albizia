import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { StatusControl } from "./StatusControl";

type ShippingAddress = {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
};

export default async function PedidoDetailPage(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
  if (!order) notFound();

  const address = order.shippingAddress as ShippingAddress;

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">
          Pedido #{order.orderNumber}
        </h1>
        <StatusControl orderId={order.id} status={order.status} />
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/50">Cliente</p>
          <p className="text-sm">{order.customerName}</p>
          <p className="text-sm text-content/60">{order.customerEmail}</p>
          <p className="text-sm text-content/60">{order.customerPhone}</p>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/50">Entrega</p>
          <p className="text-sm text-content/60">
            {address.street}, {address.number}
            {address.complement ? ` — ${address.complement}` : ""}
          </p>
          <p className="text-sm text-content/60">{address.neighborhood}</p>
          <p className="text-sm text-content/60">
            {address.city} — {address.state}, {address.zip}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Itens</p>
        <div className="divide-y divide-content/10 border-y border-content/10">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <span className="text-content/70">
                {item.productName} ({item.size}) × {item.quantity}
              </span>
              <span>
                {((item.unitPriceCents * item.quantity) / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-content/60">
            <span>Subtotal</span>
            <span>
              {(order.subtotalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <div className="flex justify-between text-content/60">
            <span>Frete</span>
            <span>
              {order.shippingCents === 0
                ? "Grátis"
                : (order.shippingCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-content/10 pt-2">
            <span className="uppercase tracking-[0.15em] text-content/60">Total</span>
            <span className="text-lg">
              {(order.totalCents / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        </div>
      </div>

      {order.mpPaymentId && (
        <p className="mt-8 text-[11px] text-content/40">
          Mercado Pago: pagamento {order.mpPaymentId} · status {order.mpStatus}
        </p>
      )}
    </div>
  );
}
