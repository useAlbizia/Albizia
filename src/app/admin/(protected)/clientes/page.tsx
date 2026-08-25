import Link from "next/link";
import { getCustomers } from "@/lib/customers";
import { brl, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const customers = await getCustomers();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Clientes</h1>
        <span className="text-[12px] text-content/50">{customers.length} cliente(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal">Cliente</th>
              <th className="py-3 pr-4 font-normal">Contato</th>
              <th className="py-3 pr-4 font-normal">Pedidos</th>
              <th className="py-3 pr-4 font-normal">Total gasto (LTV)</th>
              <th className="py-3 pr-4 font-normal">Última compra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {customers.map((c) => (
              <tr key={c.email} className="hover:bg-surface-soft">
                <td className="py-3 pr-4">
                  <Link
                    href={`/admin/clientes/${encodeURIComponent(c.email)}`}
                    className="hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-content/60">
                  <span className="block">{c.email}</span>
                  <span className="block text-[12px] text-content/40">{c.phone}</span>
                </td>
                <td className="py-3 pr-4 text-content/60">
                  {c.paidCount}
                  {c.ordersCount > c.paidCount && (
                    <span className="text-content/40"> / {c.ordersCount}</span>
                  )}
                </td>
                <td className="py-3 pr-4">{brl(c.totalSpentCents)}</td>
                <td className="py-3 pr-4 text-content/50">{shortDate(c.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {customers.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">Nenhum cliente ainda.</p>
        )}
      </div>
    </div>
  );
}
