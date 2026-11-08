import Link from "next/link";
import { brl, isoDay, shortDate } from "@/lib/format";
import { CATEGORIAS, FORMAS_PAGAMENTO, listarLancamentos, listarSocios } from "@/lib/financeiro";
import { LancamentoForm } from "./LancamentoForm";
import { LancamentoAcoes } from "./LancamentoAcoes";

export const dynamic = "force-dynamic";

const NOME_TIPO: Record<string, string> = {
  despesa: "Gasto",
  receita: "Entrada",
  aporte: "Aporte",
  devolucao_aporte: "Devolução",
  distribuicao_lucro: "Lucro",
};

export default async function LancamentosPage(props: PageProps<"/admin/lancamentos">) {
  const sp = await props.searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtro = { mes: um(sp.mes), tipo: um(sp.tipo), socioId: um(sp.socio) };

  const [socios, rows] = await Promise.all([listarSocios(), listarLancamentos(filtro)]);
  const ativos = socios.filter((s) => s.ativo).map((s) => ({ id: s.id, nome: s.nome }));
  const nomeSocio = (id: string | null) => socios.find((s) => s.id === id)?.nome ?? "";
  const hoje = isoDay(new Date());
  const filtrando = !!(filtro.mes || filtro.tipo || filtro.socioId);
  const sel = "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <div>
        <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Lançamentos</h1>
        <p className="max-w-2xl text-[12px] leading-relaxed text-content/45">
          Tudo que entra e sai, e de quem saiu. Vale lançar desde o começo, com a data verdadeira de
          cada gasto: é o que deixa o saldo de cada sócio certo em{" "}
          <Link href="/admin/socios" className="underline underline-offset-4">
            Sócios e caixa
          </Link>
          .
        </p>
      </div>

      <LancamentoForm socios={ativos} categorias={CATEGORIAS} formas={FORMAS_PAGAMENTO} hoje={hoje} />

      <section>
        <form className="mb-4 flex flex-wrap items-end gap-2">
          <input type="month" name="mes" defaultValue={filtro.mes} className={sel} aria-label="Mês" />
          <select name="tipo" defaultValue={filtro.tipo} className={sel} aria-label="Tipo">
            <option value="">Todos os tipos</option>
            {Object.entries(NOME_TIPO).map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
          <select name="socio" defaultValue={filtro.socioId} className={sel} aria-label="Sócio">
            <option value="">Todos os sócios</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border border-content px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
          >
            Filtrar
          </button>
          {filtrando && (
            <Link href="/admin/lancamentos" className="px-2 py-2 text-[11px] uppercase tracking-[0.1em] text-content/45 hover:text-content">
              Limpar
            </Link>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-content/10 text-[10px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-2.5 pr-3 font-normal">Data</th>
                <th className="py-2.5 pr-3 font-normal">Tipo</th>
                <th className="py-2.5 pr-3 font-normal">O que foi</th>
                <th className="py-2.5 pr-3 font-normal">Quem</th>
                <th className="py-2.5 pr-3 font-normal">Valor</th>
                <th className="py-2.5 pr-3 font-normal">Situação</th>
                <th className="py-2.5 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-content/10">
              {rows.map((l) => {
                const quem =
                  l.tipo === "despesa"
                    ? l.pagadores.length > 1
                      ? `Dividido (${l.pagadores.map((p) => nomeSocio(p.socioId).split(" ")[0]).join(", ")})`
                      : l.pagadores[0]?.socioId
                        ? nomeSocio(l.pagadores[0].socioId)
                        : "Empresa"
                    : l.tipo === "receita"
                      ? "Empresa"
                      : nomeSocio(l.socioId);
                return (
                  <tr key={l.id} className={l.status === "previsto" ? "text-content/45" : ""}>
                    <td className="py-3 pr-3 whitespace-nowrap">{shortDate(`${l.data}T12:00:00`)}</td>
                    <td className="py-3 pr-3 text-content/60">{NOME_TIPO[l.tipo] ?? l.tipo}</td>
                    <td className="py-3 pr-3">
                      <span className="block">
                        {l.descricao}
                        {l.parcelaTotal ? (
                          <span className="ml-1 text-[11px] text-content/45">
                            {l.parcelaNum}/{l.parcelaTotal}
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[11px] text-content/40">
                        {[l.categoria, l.fornecedor, l.formaPagamento, l.origem !== "painel" ? `via ${l.origem}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-content/70">{quem}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{brl(l.valorCents)}</td>
                    <td className="py-3 pr-3 text-[12px]">{l.status === "pago" ? "pago" : "previsto"}</td>
                    <td className="py-3">
                      <LancamentoAcoes id={l.id} status={l.status} parcelado={!!l.grupoId} descricao={l.descricao} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-10 text-center text-sm text-content/50">
              {filtrando ? "Nada com esses filtros." : "Nenhum lançamento ainda. Comece pelo primeiro gasto da marca."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
