import { getAuditLog } from "@/lib/audit";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "order.status": "Alterou status do pedido",
  "order.tracking": "Adicionou rastreio",
  "cart.recovery_email": "Enviou lembrete de carrinho",
  "coupon.create": "Criou cupom",
  "coupon.toggle": "Ativou/desativou cupom",
  "coupon.delete": "Excluiu cupom",
  "settings.save": "Salvou configurações",
  "product.create": "Criou produto",
  "product.update": "Editou produto",
  "product.delete": "Excluiu produto",
  "user.create": "Criou usuário admin",
  "review.approved": "Aprovou avaliação",
  "review.rejected": "Rejeitou avaliação",
  "review.delete": "Excluiu avaliação",
};

function detailText(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "object") {
    return Object.entries(detail as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }
  return String(detail);
}

export default async function AuditoriaPage() {
  const entries = await getAuditLog(300);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Auditoria</h1>
        <span className="text-[12px] text-content/50">{entries.length} registro(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal">Quando</th>
              <th className="py-3 pr-4 font-normal">Quem</th>
              <th className="py-3 pr-4 font-normal">Ação</th>
              <th className="py-3 pr-4 font-normal">Detalhe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="py-3 pr-4 text-content/50">{dateTime(e.createdAt)}</td>
                <td className="py-3 pr-4 text-content/60">{e.actorEmail}</td>
                <td className="py-3 pr-4">{ACTION_LABEL[e.action] ?? e.action}</td>
                <td className="py-3 pr-4 text-content/50">
                  {e.entityId ? <span className="text-content/40">#{e.entityId.slice(0, 8)} </span> : null}
                  {detailText(e.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">Nenhuma ação registrada ainda.</p>
        )}
      </div>
    </div>
  );
}
