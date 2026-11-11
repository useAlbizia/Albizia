import Link from "next/link";
import { brl } from "@/lib/format";
import { vendasPorRegiao } from "@/lib/regioes-db";
import { NOME_UF, UFS } from "@/lib/regioes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vendas por região · Painel ALBIZIA" };

// Mapa de calor do Brasil em blocos: um quadrado por estado, na posição
// aproximada do mapa, mais escuro onde a loja vende mais. Em blocos (e não
// o desenho real) porque estado pequeno como o DF ficaria invisível.
const POSICAO: Record<string, [number, number]> = {
  RR: [1, 0], AP: [3, 0],
  AM: [0, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1],
  AC: [0, 2], RO: [1, 2], TO: [2, 2], PI: [3, 2], PE: [4, 2], PB: [5, 2],
  MT: [1, 3], GO: [2, 3], BA: [3, 3], SE: [4, 3], AL: [5, 3],
  MS: [1, 4], DF: [2, 4], MG: [3, 4], ES: [4, 4],
  PR: [1, 5], SP: [2, 5], RJ: [3, 5],
  SC: [1, 6],
  RS: [1, 7],
};

const PERIODOS = [
  { v: "30", rotulo: "30 dias" },
  { v: "90", rotulo: "90 dias" },
  { v: "365", rotulo: "1 ano" },
  { v: "todos", rotulo: "Tudo" },
];

export default async function RegioesPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  const p = (Array.isArray(sp.periodo) ? sp.periodo[0] : sp.periodo) ?? "90";
  const dias = p === "todos" ? null : Number(p) || 90;
  const { estados, cidades } = await vendasPorRegiao(dias);
  const total = estados.reduce((n, e) => n + e.totalCents, 0);
  const pedidos = estados.reduce((n, e) => n + e.pedidos, 0);
  const max = Math.max(1, ...estados.map((e) => e.totalCents));
  const de = (uf: string) => estados.find((e) => e.uf === uf);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Vendas por região</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          De onde vêm as vendas, pelo endereço de entrega. Serve para decidir onde anunciar e onde vale ajustar prazo
          ou frete.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((x) => (
          <Link
            key={x.v}
            href={`/admin/regioes?periodo=${x.v}`}
            className={x.v === p ? "bg-content px-4 py-2 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
          >
            {x.rotulo}
          </Link>
        ))}
      </div>

      <p className="text-[14px]">
        <strong>{pedidos}</strong> {pedidos === 1 ? "venda" : "vendas"} · <strong>{brl(total)}</strong> ·{" "}
        {estados.length} {estados.length === 1 ? "estado" : "estados"}
      </p>

      {/* O mapa */}
      <figure className="border border-content/20 px-3 py-4 sm:px-5">
        <figcaption className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Mapa de calor</figcaption>
        <div className="mx-auto grid max-w-sm grid-cols-6 gap-1">
          {Array.from({ length: 8 * 6 }, (_, i) => {
            const col = i % 6;
            const lin = Math.floor(i / 6);
            const uf = UFS.find((u) => POSICAO[u][0] === col && POSICAO[u][1] === lin);
            if (!uf) return <span key={i} />;
            const v = de(uf);
            const forca = v ? 0.15 + 0.85 * (v.totalCents / max) : 0;
            return (
              <div
                key={uf}
                title={`${NOME_UF[uf]}: ${v ? `${v.pedidos} vendas, ${brl(v.totalCents)}` : "nenhuma venda"}`}
                className="relative flex aspect-square flex-col items-center justify-center rounded-sm border border-content/20 text-[11px] font-semibold"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-sm bg-content"
                  style={{ opacity: forca }}
                />
                <span className={`relative ${forca > 0.55 ? "text-surface" : "text-content"}`}>{uf}</span>
                {v && <span className={`relative text-[10px] font-normal ${forca > 0.55 ? "text-surface" : "text-content/70"}`}>{v.pedidos}</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-content/60">
          Quanto mais escuro, mais a loja vendeu ali. O número é a quantidade de vendas.
        </p>
      </figure>

      {/* Ranking de estados */}
      <section>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Estados</p>
        {estados.length === 0 && <p className="text-[14px] text-content/60">Nenhuma venda no período.</p>}
        <ul className="flex flex-col gap-3">
          {estados.map((e) => (
            <li key={e.uf}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span>
                  <strong>{e.uf}</strong> · {e.nome}
                </span>
                <span>
                  {brl(e.totalCents)} <span className="text-[12px] text-content/60">({e.pedidos})</span>
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full rounded-full bg-content/10">
                <div className="h-2.5 rounded-full bg-content" style={{ width: `${(e.totalCents / max) * 100}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] text-content/55">
                {total > 0 ? `${Math.round((e.totalCents / total) * 100)}% do faturamento` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {cidades.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]">Cidades que mais compram</p>
          <ol className="divide-y divide-content/10 border-y border-content/10">
            {cidades.map((c, i) => (
              <li key={`${c.cidade}-${c.uf}`} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px]">
                <span>
                  <span className="mr-2 text-content/50">{i + 1}.</span>
                  {c.cidade} <span className="text-content/60">/{c.uf}</span>
                </span>
                <span>
                  {brl(c.totalCents)} <span className="text-[12px] text-content/60">({c.pedidos})</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
