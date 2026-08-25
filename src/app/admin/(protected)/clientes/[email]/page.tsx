import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customers";
import { brl, shortDate } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage(props: PageProps<"/admin/clientes/[email]">) {
  const { email } = await props.params;
  const customer = await getCustomer(decodeURIComponent(email));
  if (!customer) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/clientes"
        className="text-[11px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
      >
        ← Clientes
      </Link>

      <h1 className="mt-4 text-xl">{customer.name}</h1>
      <p className="text-sm text-content/60">{customer.email}</p>
      <p className="text-sm text-content/60">{customer.phone}</p>

      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden bg-content/10">
        <div className="bg-surface p-6">
          <p className="text-2xl">{brl(customer.totalSpentCents)}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
            Total gasto (LTV)
          </p>
        </div>
        <div className="bg-surface p-6">
          <p className="text-2xl">{customer.paidCount}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
            Compras pagas
          </p>
        </div>
      </div>

      <p className="mb-3 mt-10 text-[11px] uppercase tracking-[0.2em] text-content/50">
        Histórico de pedidos
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <tbody className="divide-y divide-content/10 border-y border-content/10">
            {customer.orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface-soft">
                <td className="py-3 pr-4">
                  <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                    #{o.orderNumber}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-content/60">{brl(o.totalCents)}</td>
                <td className="py-3 pr-4 text-content/60">
                  {ORDER_STATUS_LABEL[o.status] ?? o.status}
                </td>
                <td className="py-3 pr-4 text-content/50">{shortDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
