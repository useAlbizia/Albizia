import Link from "next/link";
import { db } from "@/lib/db/client";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export default async function AdminPedidosPage() {
  const rows = await db.query.orders.findMany({
    orderBy: (o, { desc }) => desc(o.createdAt),
    limit: 100,
  });

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Pedidos</h1>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal">Nº</th>
              <th className="py-3 pr-4 font-normal">Cliente</th>
              <th className="py-3 pr-4 font-normal">Total</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-surface-soft">
                <td className="py-3 pr-4">
                  <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-content/60">{o.customerName}</td>
                <td className="py-3 pr-4 text-content/60">
                  {(o.totalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>
                <td className="py-3 pr-4 text-content/60">
                  {STATUS_LABEL[o.status] ?? o.status}
                </td>
                <td className="py-3 pr-4 text-content/60">
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">Nenhum pedido ainda.</p>
        )}
      </div>
    </div>
  );
}
