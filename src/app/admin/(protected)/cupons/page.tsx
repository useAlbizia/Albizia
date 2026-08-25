import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { coupons } from "@/lib/db/schema";
import { brl, shortDate } from "@/lib/format";
import { CouponForm } from "./CouponForm";
import { toggleCoupon, deleteCoupon } from "./_actions";

export const dynamic = "force-dynamic";

function describe(c: typeof coupons.$inferSelect): string {
  const base = c.type === "percent" ? `${c.value}% OFF` : `${brl(c.value)} OFF`;
  const min = c.minSubtotalCents > 0 ? ` · mín. ${brl(c.minSubtotalCents)}` : "";
  return base + min;
}

export default async function CuponsPage() {
  const rows = await db.query.coupons.findMany({ orderBy: [desc(coupons.createdAt)] });

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Cupons</h1>

      <CouponForm />

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal">Código</th>
              <th className="py-3 pr-4 font-normal">Desconto</th>
              <th className="py-3 pr-4 font-normal">Usos</th>
              <th className="py-3 pr-4 font-normal">Validade</th>
              <th className="py-3 pr-4 font-normal">Status</th>
              <th className="py-3 pr-4 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {rows.map((c) => (
              <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                <td className="py-3 pr-4 font-mono uppercase">{c.code}</td>
                <td className="py-3 pr-4 text-content/60">{describe(c)}</td>
                <td className="py-3 pr-4 text-content/60">
                  {c.usedCount}
                  {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="py-3 pr-4 text-content/50">
                  {c.expiresAt ? shortDate(c.expiresAt) : "—"}
                </td>
                <td className="py-3 pr-4 text-content/60">{c.active ? "Ativo" : "Inativo"}</td>
                <td className="py-3 pr-4">
                  <div className="flex justify-end gap-3">
                    <form action={toggleCoupon.bind(null, c.id, !c.active)}>
                      <button
                        type="submit"
                        className="text-[11px] uppercase tracking-[0.1em] text-content/50 hover:text-content"
                      >
                        {c.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action={deleteCoupon.bind(null, c.id)}>
                      <button
                        type="submit"
                        className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">Nenhum cupom criado ainda.</p>
        )}
      </div>
    </div>
  );
}
