import Link from "next/link";
import { getFinanceReport } from "@/lib/metrics";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "12 meses" },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface p-6">
      <p className="text-2xl">{value}</p>
      <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-content/40">{sub}</p>}
    </div>
  );
}

export default async function FinanceiroPage(props: PageProps<"/admin/financeiro">) {
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.dias) ? sp.dias[0] : sp.dias;
  const days = PERIODS.some((p) => String(p.days) === raw) ? Number(raw) : 30;
  const r = await getFinanceReport(days);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Financeiro</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p.days}
                href={`/admin/financeiro?dias=${p.days}`}
                className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors ${
                  p.days === days
                    ? "border-content bg-content text-surface"
                    : "border-content/30 text-content/60 hover:border-content"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <a
            href="/api/admin/export/orders"
            className="border border-content/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-content/70 transition-colors hover:border-content"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-4">
        <Stat label="Receita" value={brl(r.revenueCents)} sub={`${r.paidOrders} pedido(s) pago(s)`} />
        <Stat label="Ticket médio" value={brl(r.avgTicketCents)} />
        <Stat label="A receber" value={brl(r.pendingCents)} sub={`${r.pendingOrders} pendente(s)`} />
        <Stat label="Reembolsado" value={brl(r.refundedCents)} sub={`${r.refundedOrders} pedido(s)`} />
      </div>

      <div className="mt-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">
          Produtos mais vendidos ({PERIODS.find((p) => p.days === days)?.label})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-3 pr-4 font-normal">Produto</th>
                <th className="py-3 pr-4 font-normal">Qtd. vendida</th>
                <th className="py-3 pr-4 font-normal">Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-content/10">
              {r.topProducts.map((p) => (
                <tr key={p.productName}>
                  <td className="py-3 pr-4">{p.productName}</td>
                  <td className="py-3 pr-4 text-content/60">{p.quantity}</td>
                  <td className="py-3 pr-4 text-content/60">{brl(p.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {r.topProducts.length === 0 && (
            <p className="py-10 text-center text-sm text-content/50">
              Nenhuma venda registrada neste período.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
