import Link from "next/link";
import { getDashboardMetrics } from "@/lib/metrics";
import { getSiteSettings } from "@/lib/settings";
import { brl, shortDate } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface p-6">
      <p className="text-2xl">{value}</p>
      <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-content/40">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const settings = await getSiteSettings();
  const m = await getDashboardMetrics(settings.lowStockThreshold);

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Painel</h1>

      {/* Revenue */}
      <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-4">
        <Kpi label="Faturamento hoje" value={brl(m.today.cents)} sub={`${m.today.n} pedido(s)`} />
        <Kpi label="Últimos 7 dias" value={brl(m.last7.cents)} sub={`${m.last7.n} pedido(s)`} />
        <Kpi label="Últimos 30 dias" value={brl(m.last30.cents)} sub={`${m.last30.n} pedido(s)`} />
        <Kpi label="Ticket médio" value={brl(m.allTime.avgTicketCents)} sub="todo o período" />
      </div>

      {/* Operations */}
      <div className="mt-px grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-4">
        <Kpi label="Pedidos pagos" value={String(m.allTime.n)} sub={brl(m.allTime.cents)} />
        <div className="bg-surface p-6">
          <p className="text-2xl">{m.pending.n}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
            Aguardando pagto.
          </p>
          <Link
            href="/admin/carrinhos"
            className="mt-0.5 inline-block text-[11px] text-content/40 underline underline-offset-2 hover:text-content"
          >
            ver carrinhos
          </Link>
        </div>
        <div className="bg-surface p-6">
          <p className={`text-2xl ${m.lowStockCount > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
            {m.lowStockCount}
          </p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
            Estoque baixo
          </p>
          <Link
            href="/admin/produtos"
            className="mt-0.5 inline-block text-[11px] text-content/40 underline underline-offset-2 hover:text-content"
          >
            gerenciar
          </Link>
        </div>
        <Kpi label="Faturamento total" value={brl(m.allTime.cents)} />
      </div>

      {/* Recent orders */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Últimos pedidos</p>
          <Link
            href="/admin/pedidos"
            className="text-[11px] uppercase tracking-[0.15em] text-content/50 hover:text-content"
          >
            ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <tbody className="divide-y divide-content/10 border-y border-content/10">
              {m.recent.map((o) => (
                <tr key={o.id} className="hover:bg-surface-soft">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                      #{o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-content/60">{o.customerName}</td>
                  <td className="py-3 pr-4 text-content/60">{brl(o.totalCents)}</td>
                  <td className="py-3 pr-4 text-content/60">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </td>
                  <td className="py-3 pr-4 text-content/50">{shortDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {m.recent.length === 0 && (
            <p className="py-10 text-center text-sm text-content/50">Nenhum pedido ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
