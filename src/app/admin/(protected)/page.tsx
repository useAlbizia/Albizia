import Link from "next/link";
import { getDashboardMetrics } from "@/lib/metrics";
import { getSiteSettings } from "@/lib/settings";
import { listRecoveryQueue } from "@/lib/recovery";
import { brl, shortDate } from "@/lib/format";
import { ORDER_STATUS_LABEL, expirarPedidosAbandonados } from "@/lib/orders";

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
  // Antes de contar, tira da lista quem está sem pagar há mais de 7 dias.
  await expirarPedidosAbandonados().catch(() => 0);
  const m = await getDashboardMetrics(settings.lowStockThreshold);
  // Venda parada é a primeira coisa que alguém tem que ver ao abrir o painel:
  // é dinheiro que já estava na mesa e ainda dá para recuperar.
  const { queue } = await listRecoveryQueue().catch(() => ({ queue: [] }));
  const urgentes = queue.filter((o) => o.urgency === "agora");
  const emJogo = queue.reduce((s, o) => s + o.totalCents, 0);

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Painel</h1>

      {queue.length > 0 && (
        <Link
          href="/admin/carrinhos"
          className="mb-8 flex items-start gap-4 border border-content/25 p-5 transition-colors hover:border-content"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-content px-1.5 text-[11px] font-medium leading-none text-surface"
          >
            {queue.length}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-content">
              {queue.length === 1 ? "1 venda parada" : `${queue.length} vendas paradas`}
              {urgentes.length > 0 && (
                <>
                  {", "}
                  <strong className="font-medium">
                    {urgentes.length === 1
                      ? "1 para ligar agora"
                      : `${urgentes.length} para ligar agora`}
                  </strong>
                </>
              )}
            </span>
            <span className="mt-1 block text-[12px] text-content/50">
              {brl(emJogo)} esperando. {urgentes[0] ? urgentes[0].situation : queue[0].situation}
            </span>
            <span className="mt-2 inline-block text-[11px] uppercase tracking-[0.15em] text-content/50">
              Abrir a fila
            </span>
          </span>
        </Link>
      )}

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
          <p className="mt-1 text-[10px] leading-snug text-content/35">Sem pagamento há 7 dias, cancela sozinho.</p>
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
            className="btn-sec"
          >
            Ver todos
          </Link>
        </div>
        {/* Cada pedido é um bloco inteiro clicável. Antes só o "#número" abria,
            e no celular o toque no resto da linha não fazia nada. */}
        <div>
          <ul className="divide-y divide-content/10 border-y border-content/10">
            {m.recent.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/pedidos/${o.id}`}
                  className="flex items-center justify-between gap-3 py-3.5 hover:bg-surface-soft active:bg-surface-soft"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium">
                      #{o.orderNumber} · {brl(o.totalCents)}
                    </span>
                    <span className="block truncate text-[12px] text-content/60">
                      {o.customerName} · {shortDate(o.createdAt)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-content/70">
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                    <span aria-hidden="true" className="text-lg leading-none">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {m.recent.length === 0 && (
            <p className="py-10 text-center text-sm text-content/50">Nenhum pedido ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
