import Link from "next/link";
import { getAnalyticsSummary, getRecentEvents, type Bucket } from "@/lib/analytics";
import { analyticsInsight } from "@/lib/ai";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PERIODS = [
  { d: 1, label: "Hoje" },
  { d: 7, label: "7 dias" },
  { d: 30, label: "30 dias" },
  { d: 90, label: "90 dias" },
];

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TYPE_LABEL: Record<string, string> = {
  page_view: "Página",
  product_view: "Produto",
  add_to_cart: "Carrinho",
  checkout_start: "Checkout",
  order_created: "Pedido",
  order_paid: "Pago",
};

function Bars({ title, items, total }: { title: string; items: Bucket[]; total?: number }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  const sum = total ?? items.reduce((s, i) => s + i.n, 0);
  return (
    <div>
      <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-content/40">Sem dados ainda.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <div key={it.label} className="flex items-center gap-3 text-sm">
              <span className="w-32 truncate text-content/70" title={it.label}>{it.label}</span>
              <div className="h-4 flex-1 bg-content/5">
                <div className="h-full bg-content/40" style={{ width: `${(it.n / max) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-content/60">
                {it.n}
                {sum > 0 && <span className="text-content/40"> · {pct(it.n, sum)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AnalyticsPage(props: PageProps<"/admin/analytics">) {
  const sp = await props.searchParams;
  const raw = Array.isArray(sp.dias) ? sp.dias[0] : sp.dias;
  const days = PERIODS.some((p) => String(p.d) === raw) ? Number(raw) : 7;

  const [a, recent] = await Promise.all([getAnalyticsSummary(days), getRecentEvents(60)]);

  const insight = await analyticsInsight({
    periodoDias: days,
    visitantesUnicos: a.uniqueVisitors,
    retornantes: a.returningVisitors,
    sessoes: a.sessions,
    paginasVistas: a.pageViews,
    produtosVistos: a.productViews,
    adicoesCarrinho: a.addToCart,
    pedidosPagos: a.ordersPaid,
    receita: money(a.revenueCents),
    dispositivos: a.devices,
    navegadores: a.browsers.slice(0, 3),
    cidades: a.cities.slice(0, 3),
    origens: a.referrers.slice(0, 3),
  });

  const maxDay = Math.max(1, ...a.daily.map((d) => d.views));
  const maxHour = Math.max(1, ...a.hourly.map((h) => h.n));

  const kpis = [
    { label: "Visitantes únicos", value: a.uniqueVisitors },
    { label: "Retornantes", value: a.returningVisitors },
    { label: "Sessões", value: a.sessions },
    { label: "Páginas vistas", value: a.pageViews },
    { label: "Produtos vistos", value: a.productViews },
    { label: "Carrinho", value: a.addToCart },
    { label: "Pedidos pagos", value: a.ordersPaid },
    { label: "Conversão", value: pct(a.ordersPaid, a.uniqueVisitors) },
  ];

  const funnel = [
    { label: "Visitas", n: a.pageViews },
    { label: "Produtos", n: a.productViews },
    { label: "Carrinho", n: a.addToCart },
    { label: "Checkout", n: a.checkoutStart },
    { label: "Pagos", n: a.ordersPaid },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Analytics</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Link
              key={p.d}
              href={`/admin/analytics?dias=${p.d}`}
              className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors ${p.d === days ? "border-content bg-content text-surface" : "border-content/30 text-content/60 hover:border-content"}`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {insight && (
        <div className="mb-8 border-l-2 border-content/40 bg-content/[0.03] p-4 text-[13px] leading-relaxed text-content/70">
          <span className="mr-1">✦</span> {insight}
        </div>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface p-6">
            <p className="text-2xl">{k.value}</p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Visitas · 14 dias</p>
          <div className="flex h-36 items-end gap-1">
            {a.daily.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full bg-content/70" style={{ height: `${(d.views / maxDay) * 100}%` }} title={`${d.date}: ${d.views}`} />
                <span className="text-[9px] text-content/40">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Por hora do dia (BRT)</p>
          <div className="flex h-36 items-end gap-[2px]">
            {a.hourly.map((h) => (
              <div key={h.hour} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${h.hour}h: ${h.n}`}>
                <div className="w-full bg-content/50" style={{ height: `${(h.n / maxHour) * 100}%` }} />
                {h.hour % 6 === 0 && <span className="text-[9px] text-content/40">{h.hour}h</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <Bars title="Dispositivos" items={[{ label: "Celular", n: a.devices.mobile }, { label: "Computador", n: a.devices.desktop }, { label: "Tablet", n: a.devices.tablet }].filter((x) => x.n > 0)} />
        <Bars title="Navegadores" items={a.browsers} />
        <Bars title="Sistema" items={a.os} />
        <Bars title="Cidades" items={a.cities} />
        <Bars title="Origem do tráfego" items={a.referrers.filter((r) => r.n > 0)} />
        <Bars title="Páginas mais vistas" items={a.topPages} />
      </div>

      {/* Funnel */}
      <div className="mt-12">
        <p className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Funil</p>
        <div className="flex flex-col gap-2">
          {funnel.map((f, i) => (
            <div key={f.label} className="flex items-center gap-4">
              <span className="w-28 text-sm text-content/70">{f.label}</span>
              <div className="h-6 flex-1 bg-content/5">
                <div className="h-full bg-content/40" style={{ width: pct(f.n, funnel[0].n) }} />
              </div>
              <span className="w-24 text-right text-sm text-content/60">{f.n} · {i === 0 ? "100%" : pct(f.n, funnel[0].n)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forensic event log */}
      <div className="mt-12">
        <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/50">Registro de visitas (auditoria)</p>
        <p className="mb-4 text-[12px] text-content/40">
          As {recent.length} ações mais recentes, para você conferir que os dados são reais. Cada
          visitante tem um id curto — o mesmo id em linhas diferentes é a mesma pessoa/navegador.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-content/10 text-[10px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-2 pr-3 font-normal">Quando</th>
                <th className="py-2 pr-3 font-normal">Ação</th>
                <th className="py-2 pr-3 font-normal">Página</th>
                <th className="py-2 pr-3 font-normal">Dispositivo</th>
                <th className="py-2 pr-3 font-normal">Navegador</th>
                <th className="py-2 pr-3 font-normal">Local</th>
                <th className="py-2 pr-3 font-normal">Origem</th>
                <th className="py-2 pr-3 font-normal">Visitante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-content/10 text-content/60">
              {recent.map((e, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-content/50">{dateTime(e.createdAt)}</td>
                  <td className="py-2 pr-3">{TYPE_LABEL[e.type] ?? e.type}</td>
                  <td className="py-2 pr-3 max-w-[160px] truncate" title={e.path ?? ""}>{e.path ?? "—"}</td>
                  <td className="py-2 pr-3">{e.device ?? "—"}</td>
                  <td className="py-2 pr-3">{e.browser ?? "—"}{e.os ? ` · ${e.os}` : ""}</td>
                  <td className="py-2 pr-3">{e.city ? `${e.city}${e.region ? `/${e.region}` : ""}` : "—"}</td>
                  <td className="py-2 pr-3 max-w-[120px] truncate" title={e.referrer ?? ""}>{e.referrer ?? "direto"}</td>
                  <td className="py-2 pr-3 font-mono text-content/40">{e.visitor ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <p className="py-10 text-center text-sm text-content/50">Nenhuma visita registrada ainda.</p>}
        </div>
      </div>

      <p className="mt-10 text-[11px] leading-relaxed text-content/40">
        Dados 100% reais e anônimos (sem dados pessoais nem IP). Bots, rastreadores, ferramentas e
        acessos de desenvolvimento (localhost) são descartados. Visitante único = navegador/pessoa;
        sessão = uma visita; retornante = visto em mais de uma visita. Localização vinda da rede
        (aproximada, nível cidade).
      </p>
    </div>
  );
}
