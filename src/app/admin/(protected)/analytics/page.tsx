import { getAnalyticsSummary } from "@/lib/analytics";

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AnalyticsPage() {
  const a = await getAnalyticsSummary(30);
  const maxDay = Math.max(1, ...a.daily.map((d) => d.views));

  const kpis = [
    { label: "Visitantes únicos", value: a.uniqueVisitors },
    { label: "Retornantes", value: a.returningVisitors },
    { label: "Sessões (visitas)", value: a.sessions },
    { label: "Páginas vistas", value: a.pageViews },
    { label: "Produtos vistos", value: a.productViews },
    { label: "Adições ao carrinho", value: a.addToCart },
    { label: "Pedidos pagos", value: a.ordersPaid },
    { label: "Taxa de conversão", value: pct(a.ordersPaid, a.uniqueVisitors) },
    { label: "Receita", value: money(a.revenueCents) },
  ];

  const totalDevices = a.devices.mobile + a.devices.tablet + a.devices.desktop;
  const deviceRows = [
    { label: "Celular", n: a.devices.mobile },
    { label: "Computador", n: a.devices.desktop },
    { label: "Tablet", n: a.devices.tablet },
  ];

  const funnel = [
    { label: "Visitas", n: a.pageViews },
    { label: "Produtos vistos", n: a.productViews },
    { label: "Carrinho", n: a.addToCart },
    { label: "Checkout", n: a.checkoutStart },
    { label: "Pedidos", n: a.ordersCreated },
    { label: "Pagos", n: a.ordersPaid },
  ];

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Analytics</h1>
        <span className="text-[11px] uppercase tracking-[0.15em] text-content/40">
          Últimos {a.days} dias
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface p-6">
            <p className="text-2xl">{k.value}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Devices */}
      {totalDevices > 0 && (
        <div className="mt-10">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">
            Dispositivos (visitantes únicos)
          </p>
          <div className="flex flex-col gap-2">
            {deviceRows.map((d) => (
              <div key={d.label} className="flex items-center gap-4">
                <span className="w-28 text-sm text-content/70">{d.label}</span>
                <div className="h-5 flex-1 bg-content/5">
                  <div className="h-full bg-content/40" style={{ width: pct(d.n, totalDevices) }} />
                </div>
                <span className="w-24 text-right text-sm text-content/60">
                  {d.n} · {pct(d.n, totalDevices)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visits chart (14 days) */}
      <div className="mt-12">
        <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">
          Visitas · 14 dias
        </p>
        <div className="flex h-40 items-end gap-1">
          {a.daily.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full bg-content/70 transition-colors group-hover:bg-content"
                style={{ height: `${(d.views / maxDay) * 100}%` }}
                title={`${d.date}: ${d.views}`}
              />
              <span className="text-[9px] text-content/40">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel */}
      <div className="mt-12">
        <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Funil</p>
        <div className="flex flex-col gap-2">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-4">
              <span className="w-36 text-sm text-content/70">{f.label}</span>
              <div className="h-6 flex-1 bg-content/5">
                <div
                  className="h-full bg-content/40"
                  style={{ width: pct(f.n, funnel[0].n) }}
                />
              </div>
              <span className="w-24 text-right text-sm text-content/60">
                {f.n} · {i === 0 ? "100%" : pct(f.n, funnel[0].n)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top viewed products */}
      <div className="mt-12">
        <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">
          Produtos mais vistos
        </p>
        {a.topViewed.length === 0 ? (
          <p className="text-sm text-content/40">Ainda sem dados suficientes.</p>
        ) : (
          <div className="divide-y divide-content/10 border-y border-content/10">
            {a.topViewed.map((t) => (
              <div key={t.slug} className="flex justify-between py-3 text-sm">
                <span className="text-content/70">{t.slug}</span>
                <span className="text-content/50">{t.count} visualizações</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-10 text-[11px] leading-relaxed text-content/40">
        Dados 100% reais e anônimos (sem dados pessoais), coletados direto no seu banco. Bots,
        rastreadores, ferramentas e acessos de desenvolvimento (localhost) são descartados
        automaticamente. Visitante único = pessoa (persistente); sessão = uma visita; retornante =
        visto em mais de uma visita.
      </p>
    </div>
  );
}
