import { getMarketingOverview } from "@/lib/marketing";
import { CampaignForm } from "./CampaignForm";

export default async function MarketingPage() {
  const { active, total, recentSubs, recentCampaigns } = await getMarketingOverview();

  return (
    <div className="flex flex-col gap-14">
      <div>
        <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">E-mail marketing</h1>
        <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-3">
          <div className="bg-surface p-6">
            <p className="text-2xl">{active}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
              Inscritos ativos
            </p>
          </div>
          <div className="bg-surface p-6">
            <p className="text-2xl">{total}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">Total</p>
          </div>
          <div className="bg-surface p-6">
            <p className="text-2xl">{recentCampaigns.length}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">Campanhas</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-6 text-sm uppercase tracking-[0.3em] text-content/60">Nova campanha</h2>
        <CampaignForm activeCount={active} />
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">
            Inscritos recentes
          </h2>
          {recentSubs.length === 0 ? (
            <p className="text-sm text-content/40">Nenhum inscrito ainda.</p>
          ) : (
            <div className="divide-y divide-content/10 border-y border-content/10 text-sm">
              {recentSubs.map((s) => (
                <div key={s.id} className="flex justify-between py-2">
                  <span className="text-content/70">{s.email}</span>
                  <span className="text-content/40">
                    {s.status === "active" ? "ativo" : "cancelado"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">
            Campanhas enviadas
          </h2>
          {recentCampaigns.length === 0 ? (
            <p className="text-sm text-content/40">Nenhuma campanha ainda.</p>
          ) : (
            <div className="divide-y divide-content/10 border-y border-content/10 text-sm">
              {recentCampaigns.map((c) => (
                <div key={c.id} className="flex justify-between py-2">
                  <span className="text-content/70">{c.subject}</span>
                  <span className="text-content/40">{c.recipientCount} envios</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-content/40">
        Cada e-mail inclui link de cancelamento automático. O disparo para clientes reais depende
        de um domínio verificado no Resend. Antes disso, só chega no e-mail da conta.
      </p>
    </div>
  );
}
