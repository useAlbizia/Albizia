import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { lancamentoAprovacoes, lancamentos as tabLancamentos } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { brl, isoDay } from "@/lib/format";
import {
  CATEGORIAS,
  FORMAS_PAGAMENTO,
  listarAutomaticos,
  listarLancamentos,
  listarSocios,
  type LinhaAutomatica,
} from "@/lib/financeiro";
import { pendentesDe, socioPorEmail } from "@/lib/aprovacao";
import { LancamentoAcoes } from "./LancamentoAcoes";
import { CartaoAprovar, NovoLancamento } from "./Interativos";

export const dynamic = "force-dynamic";

const NOME_TIPO: Record<string, string> = {
  despesa: "Gasto",
  receita: "Entrada",
  aporte: "Aporte",
  devolucao_aporte: "Devolução",
  distribuicao_lucro: "Lucro",
};
// Entrada no caixa da empresa soma; saída subtrai. Aporte entra; devolução e
// lucro saem. Gasto pago por sócio não sai do caixa, mas é gasto da empresa.
const ENTRA = new Set(["receita", "aporte"]);

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

function Selo({ aprovacao }: { aprovacao: string }) {
  if (aprovacao === "aprovado") return null;
  const contestado = aprovacao === "contestado";
  return (
    <span
      className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[10px] uppercase tracking-[0.1em] ${
        contestado ? "border border-content text-content" : "border border-content/30 text-content/60"
      }`}
    >
      {contestado ? "contestado" : "aguardando aprovação"}
    </span>
  );
}

export default async function LancamentosPage(props: PageProps<"/admin/lancamentos">) {
  const user = await requireAdmin();
  const sp = await props.searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtro = { mes: um(sp.mes), tipo: um(sp.tipo), socioId: um(sp.socio) };
  const mostrar = um(sp.mostrar); // "" | lancados | automaticos

  const [socios, rows, autos, eu] = await Promise.all([
    listarSocios(),
    mostrar === "automaticos" ? Promise.resolve([]) : listarLancamentos(filtro),
    mostrar === "lancados" || filtro.socioId ? Promise.resolve([] as LinhaAutomatica[]) : listarAutomaticos(filtro),
    socioPorEmail(user.email),
  ]);
  const ativos = socios.filter((s) => s.ativo).map((s) => ({ id: s.id, nome: s.nome }));
  const nome = (id: string | null | undefined) => socios.find((s) => s.id === id)?.nome.split(" ")[0] ?? "";
  const hoje = isoDay(new Date());

  // Votos de cada lançamento listado, para mostrar quem já aprovou.
  const chaves = [...new Set(rows.map((l) => l.grupoId ?? l.id))];
  const votos = chaves.length
    ? await db.select().from(lancamentoAprovacoes).where(inArray(lancamentoAprovacoes.chave, chaves))
    : [];

  // Os que esperam o MEU voto, com a compra parcelada agrupada.
  const minhasChaves = eu ? await pendentesDe(eu.id) : [];
  const paraAprovar = minhasChaves.length
    ? await db.select().from(tabLancamentos).where(inArray(tabLancamentos.id, minhasChaves)).then(async (avulsos) => {
        const grupos = await db.select().from(tabLancamentos).where(inArray(tabLancamentos.grupoId, minhasChaves));
        return minhasChaves.map((c) => {
          const linhas = [...avulsos, ...grupos].filter((l) => (l.grupoId ?? l.id) === c);
          const l = linhas[0];
          const total = linhas.reduce((n, x) => n + x.valorCents, 0);
          return {
            chave: c,
            titulo: l ? `${NOME_TIPO[l.tipo] ?? l.tipo}: ${l.descricao}` : "",
            detalhe: l ? `${dataBr(l.data)}${linhas.length > 1 ? ` · ${linhas.length} parcelas` : ""}${l.formaPagamento ? ` · ${l.formaPagamento}` : ""}` : "",
            valor: brl(total),
            autor: nome(l?.criadoPorSocioId) || l?.criadoPor || "",
          };
        });
      })
    : [];

  // Compra parcelada vira UM item na lista, com as parcelas dentro. Antes
  // cada parcela era uma linha, e a prensa em 10x enchia a tela com dez
  // "Prensa Térmica R$ 150" iguais.
  type Linha = (typeof rows)[number];
  type Item =
    | { k: "manual"; data: string; ordem: number; linhas: Linha[] }
    | { k: "auto"; data: string; ordem: number; a: LinhaAutomatica };
  const porChave = new Map<string, Linha[]>();
  for (const l of rows) {
    const c = l.grupoId ?? l.id;
    porChave.set(c, [...(porChave.get(c) ?? []), l]);
  }
  const itens: Item[] = [
    ...[...porChave.values()].map((ls) => {
      const linhas = [...ls].sort((a, b) => (a.parcelaNum ?? 0) - (b.parcelaNum ?? 0));
      return { k: "manual" as const, data: linhas[0].data, ordem: linhas[0].createdAt.getTime(), linhas };
    }),
    ...autos.map((a) => ({ k: "auto" as const, data: a.data, ordem: 0, a })),
  ].sort((x, y) => y.data.localeCompare(x.data) || y.ordem - x.ordem);

  // "Nilson e Jair", "Nilson, Jair e Devid".
  const juntar = (nomes: string[]) =>
    nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

  const filtrando = !!(filtro.mes || filtro.tipo || filtro.socioId || mostrar);
  const sel = "border border-content/30 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-content";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Lançamentos</h1>
        <p className="text-[13px] leading-relaxed text-content/55">
          Todo dinheiro que entra e sai da empresa. Vendas do site, taxas e etiquetas entram sozinhas.
          O que um sócio lança vale quando mais um sócio aprova, e qualquer um pode contestar. Saldos em{" "}
          <Link href="/admin/socios" className="underline underline-offset-4">
            Sócios e caixa
          </Link>
          .
        </p>
      </div>

      <NovoLancamento socios={ativos} categorias={CATEGORIAS} formas={FORMAS_PAGAMENTO} hoje={hoje} />

      {paraAprovar.length > 0 && (
        <section className="flex flex-col gap-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-content/70">
            Esperando a sua aprovação ({paraAprovar.length})
          </p>
          {paraAprovar.map((p) => (
            <CartaoAprovar key={p.chave} {...p} />
          ))}
        </section>
      )}

      <section>
        <details className="mb-4" open={filtrando}>
          <summary className="cursor-pointer text-[12px] uppercase tracking-[0.15em] text-content/55">Filtrar</summary>
          <form className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <select name="mostrar" defaultValue={mostrar} className={sel} aria-label="Mostrar">
              <option value="">Lançados e automáticos</option>
              <option value="lancados">Só lançados à mão</option>
              <option value="automaticos">Só automáticos</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className="flex-1 border border-content py-2.5 text-[12px] uppercase tracking-[0.15em]">
                Filtrar
              </button>
              {filtrando && (
                <Link href="/admin/lancamentos" className="flex-1 border border-content/25 py-2.5 text-center text-[12px] uppercase tracking-[0.15em] text-content/60">
                  Limpar
                </Link>
              )}
            </div>
          </form>
        </details>

        <ul className="divide-y divide-content/10 border-y border-content/10">
          {itens.map((it) => {
            if (it.k === "auto") {
              const a = it.a;
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[15px]">{a.descricao}</p>
                    <p className="mt-0.5 text-[12px] text-content/45">
                      {dataBr(a.data)} · automático · {a.fonte}
                      {a.detalhe ? ` · ${a.detalhe}` : ""}
                    </p>
                    <Link href={`/admin/pedidos/${a.pedidoId}`} className="mt-1 inline-block text-[11px] uppercase tracking-[0.1em] text-content/45 underline-offset-4 hover:underline">
                      ver pedido
                    </Link>
                  </div>
                  <p className="shrink-0 text-[15px]">
                    {a.tipo === "receita" ? "+" : "−"} {brl(a.valorCents)}
                  </p>
                </li>
              );
            }
            const linhas = it.linhas;
            const l = linhas[0];
            const chave = l.grupoId ?? l.id;
            const parcelado = linhas.length > 1 || !!l.grupoId;
            const total = linhas.reduce((n, x) => n + x.valorCents, 0);
            const pagas = linhas.filter((x) => x.status === "pago");
            const proxima = linhas.find((x) => x.status === "previsto");
            // Quem pagou, com nome: "Nilson e Jair, em partes iguais".
            const pagadores = [...new Set(l.pagadores.map((p) => p.socioId))];
            const quem =
              l.tipo === "despesa"
                ? pagadores.length > 1
                  ? `pago por ${juntar(pagadores.map((id) => (id ? nome(id) : "empresa")))}, em partes iguais`
                  : pagadores[0]
                    ? `pago por ${nome(pagadores[0])}`
                    : "pago pela empresa"
                : l.tipo === "receita"
                  ? "para a empresa"
                  : nome(l.socioId);
            const aprovaram = votos.filter((v) => v.chave === chave && v.decisao === "aprovado").map((v) => nome(v.socioId));
            const contestacao = votos.find((v) => v.chave === chave && v.decisao === "contestado");
            const n = l.parcelaTotal ?? linhas.length;
            // Com filtro de mês chega só a parcela daquele mês: aí o cartão
            // fala dela, sem fingir total e contagem da compra inteira.
            const completo = !parcelado || linhas.length >= n;
            return (
              <li key={chave} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium">
                      {l.descricao}
                      <Selo aprovacao={l.aprovacao} />
                    </p>
                    <p className="mt-1 text-[13px] text-content/65">
                      {NOME_TIPO[l.tipo] ?? l.tipo} · {quem}
                    </p>
                    {parcelado && !completo ? (
                      <p className="mt-0.5 text-[12px] text-content/50">
                        {linhas.map((p) => `parcela ${p.parcelaNum} de ${n} · ${dataBr(p.data)} · ${p.status === "pago" ? "paga" : "a vencer"}`).join("; ")}
                      </p>
                    ) : parcelado ? (
                      <p className="mt-0.5 text-[12px] text-content/50">
                        {n}x de {brl(l.valorCents)} no {(l.formaPagamento || "cartão").toLowerCase()} ·{" "}
                        <strong className="font-medium text-content/75">
                          {pagas.length} de {n} pagas
                        </strong>
                        {proxima ? ` · próxima em ${dataBr(proxima.data)}` : " · quitado"}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-[12px] text-content/50">
                        {dataBr(l.data)}
                        {l.categoria ? ` · ${l.categoria}` : ""}
                        {l.formaPagamento ? ` · ${l.formaPagamento}` : ""}
                      </p>
                    )}
                    <p className="mt-0.5 text-[12px] text-content/45">
                      Lançado por {nome(l.criadoPorSocioId) || l.criadoPor || "?"}
                      {aprovaram.length > 0 && ` · aprovado por ${aprovaram.join(" e ")}`}
                    </p>
                    {contestacao && (
                      <p className="mt-1 text-[12px] text-content/80">
                        {nome(contestacao.socioId)} contestou: “{contestacao.comentario}”
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-medium">
                      {ENTRA.has(l.tipo) ? "+" : "−"} {brl(total)}
                    </p>
                    {parcelado && completo && <p className="mt-0.5 text-[11px] text-content/45">total</p>}
                  </div>
                </div>
                {parcelado && completo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] uppercase tracking-[0.1em] text-content/50">
                      Ver parcelas
                    </summary>
                    <ul className="mt-2 flex flex-col gap-1 border-l border-content/15 pl-3 text-[12px]">
                      {linhas.map((p) => (
                        <li key={p.id} className={`flex justify-between gap-3 ${p.status === "pago" ? "" : "text-content/45"}`}>
                          <span>
                            {p.parcelaNum ?? 1}/{n} · {dataBr(p.data)} · {p.status === "pago" ? "paga" : "vence nesse dia"}
                          </span>
                          <span>{brl(p.valorCents)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="mt-2">
                  <LancamentoAcoes id={l.id} parcelado={!!l.grupoId} descricao={l.descricao} />
                </div>
              </li>
            );
          })}
        </ul>
        {itens.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">
            {filtrando ? "Nada com esses filtros." : "Nenhum lançamento ainda. Toque em Novo lançamento para começar."}
          </p>
        )}
      </section>
    </div>
  );
}
