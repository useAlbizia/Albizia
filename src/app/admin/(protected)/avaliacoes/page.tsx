import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { reviews } from "@/lib/db/schema";
import { Stars } from "@/components/Stars";
import { shortDate } from "@/lib/format";
import { approveReview, rejectReview, deleteReview } from "./_actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export default async function AvaliacoesPage() {
  const rows = await db.query.reviews.findMany({
    with: { product: { columns: { name: true, slug: true } } },
    orderBy: [desc(sql`(${reviews.status} = 'pending')`), desc(reviews.createdAt)],
    limit: 300,
  });

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Avaliações</h1>
        <span className="text-[12px] text-content/50">{pendingCount} pendente(s)</span>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`border p-5 ${
              r.status === "pending" ? "border-content/30" : "border-content/10"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Stars value={r.rating} className="tracking-widest text-content" />
                <span className="text-sm text-content/70">{r.authorName}</span>
                <span
                  className={`text-[11px] uppercase tracking-[0.1em] ${
                    r.status === "approved"
                      ? "text-green-600 dark:text-green-400"
                      : r.status === "rejected"
                        ? "text-content/40"
                        : "text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <span className="text-[12px] text-content/40">{shortDate(r.createdAt)}</span>
            </div>

            <p className="mt-1 text-[12px] text-content/40">
              {r.product?.name ?? "Produto removido"}
            </p>
            {r.comment && (
              <p className="mt-2 whitespace-pre-line text-sm text-content/70">{r.comment}</p>
            )}

            <div className="mt-4 flex gap-4">
              {r.status !== "approved" && (
                <form action={approveReview.bind(null, r.id)}>
                  <button className="text-[11px] uppercase tracking-[0.1em] text-green-700 hover:underline dark:text-green-400">
                    Aprovar
                  </button>
                </form>
              )}
              {r.status !== "rejected" && (
                <form action={rejectReview.bind(null, r.id)}>
                  <button className="text-[11px] uppercase tracking-[0.1em] text-content/50 hover:text-content">
                    Rejeitar
                  </button>
                </form>
              )}
              <form action={deleteReview.bind(null, r.id)}>
                <button className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content">
                  Excluir
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="py-10 text-center text-sm text-content/50">Nenhuma avaliação ainda.</p>
      )}
    </div>
  );
}
