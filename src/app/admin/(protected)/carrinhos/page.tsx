import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { brl } from "@/lib/format";
import { RecoveryButton } from "./RecoveryButton";

export const dynamic = "force-dynamic";

// How old a pending order must be before we treat it as truly "abandoned"
// (rather than a checkout still in progress at Mercado Pago).
const ABANDONED_MINUTES = 60;

function ageLabel(createdAt: Date): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Kept as a top-level helper (not inline in the component) so the clock read
// isn't flagged as an impure call in render — this is a server component that
// renders once per request, so "now" is correct.
function isAbandoned(createdAt: Date): boolean {
  return Date.now() - new Date(createdAt).getTime() >= ABANDONED_MINUTES * 60000;
}

export default async function CarrinhosPage() {
  const pending = await db.query.orders.findMany({
    where: eq(orders.status, "pending"),
    orderBy: [desc(orders.createdAt)],
    with: { items: true },
    limit: 200,
  });

  const abandoned = pending.filter((o) => isAbandoned(o.createdAt));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Carrinhos abandonados</h1>
        <span className="text-[12px] text-content/50">{abandoned.length} carrinho(s)</span>
      </div>
      <p className="mb-8 max-w-2xl text-[12px] text-content/40">
        Checkouts iniciados que ainda não foram pagos após {ABANDONED_MINUTES} minutos. Envie um
        lembrete por e-mail para tentar recuperar a venda.
      </p>

      <div className="space-y-3">
        {abandoned.map((o) => (
          <div
            key={o.id}
            className="flex flex-col gap-4 border border-content/10 p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/pedidos/${o.id}`}
                  className="text-sm hover:underline"
                >
                  #{o.orderNumber}
                </Link>
                <span className="text-[11px] uppercase tracking-[0.1em] text-content/40">
                  há {ageLabel(o.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-content/70">{o.customerName}</p>
              <p className="text-[12px] text-content/40">{o.customerEmail}</p>
              <p className="mt-1 text-[12px] text-content/50">
                {o.items.map((i) => `${i.productName} (${i.size})×${i.quantity}`).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-2">
              <span className="text-sm">{brl(o.subtotalCents)}</span>
              <RecoveryButton
                orderId={o.id}
                sentAt={o.recoveryEmailSentAt ? o.recoveryEmailSentAt.toISOString() : null}
              />
            </div>
          </div>
        ))}
      </div>

      {abandoned.length === 0 && (
        <p className="py-10 text-center text-sm text-content/50">
          Nenhum carrinho abandonado no momento. 🎉
        </p>
      )}
    </div>
  );
}
