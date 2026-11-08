import Link from "next/link";
import { brl, isoDay } from "@/lib/format";
import { fechamentoDoMes } from "@/lib/financeiro";
import { MetaForm } from "./MetaForm";

export const dynamic = "force-dynamic";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function nomeMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}
function vizinho(mes: string, passo: number) {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + passo;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
const pct = (permil: number | null) => (permil === null ? "" : `${(permil / 10).toFixed(1).replace(".", ",")}%`);

// Uma linha do demonstrativo. "sinal" mostra se a linha soma ou subtrai, que
// é o que deixa a conta legível sem precisar saber contabilidade.
function Linha({
  rotulo,
  valor,
  sinal,
  forte,
  dica,
}: {
  rotulo: string;
  valor: number;
  sinal?: "+" | "−" | "=";
  forte?: boolean;
  dica?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${forte ? "border-t border-content/15" : ""}`}>
      <div className="min-w-0">
        <p className={`text-sm ${forte ? "" : "text-content/70"}`}>
          {sinal && <span className="mr-2 inline-block w-3 text-content/40">{sinal}</span>}
          {rotulo}
        </p>
        {dica && <p className="ml-5 text-[11px] leading-relaxed text-content/40">{dica}</p>}
      </div>
      <p className={`shrink-0 whitespace-nowrap ${forte ? "text-base" : "text-sm text-content/80"}`}>{brl(valor)}</p>
    </div>
  );
}

export default async function FechamentoPage(props: PageProps<"/admin/fechamento">) {
  const sp = await props.searchParams;
  const pedido = Array.isArray(sp.mes) ? sp.mes[0] : sp.mes;
  const atual = isoDay(new Date()).slice(0, 7);
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : atual;
  const f = await fechamentoDoMes(mes);
  const d = f.dre;
  const lucro = d.resultadoCents >= 0;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Fechamento do mês</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link href={`/admin/fechamento?mes=${vizinho(mes, -1)}`} className="px-2 text-content/50 hover:text-content" aria-label="Mês anterior">
            ‹
          </Link>
          <span className="min-w-[150px] text-center capitalize">{nomeMes(mes)}</span>
          {mes < atual ? (
            <Link href={`/admin/fechamento?mes=${vizinho(mes, 1)}`} className="px-2 text-content/50 hover:text-content" aria-label="Próximo mês">
              ›
            </Link>
          ) : (
            <span className="px-2 text-content/15">›</span>
          )}
        </nav>
      </div>

      {/* O número que responde "o mês deu lucro?", antes de qualquer detalhe. */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="border border-content/15 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-content/45">Vendeu</p>
          <p className="mt-1 text-2xl font-light">{brl(d.receitaBrutaCents)}</p>
        </div>
        <div className="border border-content/15 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-content/45">{lucro ? "Lucro do mês" : "Prejuízo do mês"}</p>
          <p className="mt-1 text-2xl font-light">{brl(Math.abs(d.resultadoCents))}</p>
        </div>
        <div className="border border-content/15 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-content/45">Caixa no fim do mês</p>
          <p className="mt-1 text-2xl font-light">{brl(f.caixa.finalCents)}</p>
        </div>
      </section>

      {d.avisos.length > 0 && (
        <div className="border border-content/30 px-5 py-4 text-[13px] leading-relaxed">
          {d.avisos.map((a) => (
            <p key={a}>{a}</p>
          ))}
          {f.produtosSemCusto.length > 0 && (
            <p className="mt-2 text-content/60">
              Preencha o custo em:{" "}
              {f.produtosSemCusto.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/admin/produtos/${p.id}`} className="underline underline-offset-4">
                    {p.nome}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </div>
      )}

      <section className="border border-content/15 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Meta</p>
        {d.meta ? (
          <>
            <p className="mt-2 text-sm">
              {brl(d.meta.realizadoCents)} de {brl(d.meta.metaCents)} · {pct(d.meta.permil)}
            </p>
            <div className="mt-2 h-2 w-full bg-content/10">
              <div className="h-2 bg-content" style={{ width: `${Math.min(100, d.meta.permil / 10)}%` }} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[12px] text-content/45">Sem meta para este mês.</p>
        )}
        <div className="mt-3">
          <MetaForm mes={mes} atual={d.meta ? (d.meta.metaCents / 100).toFixed(2).replace(".", ",") : ""} />
        </div>
        {d.pontoEquilibrioCents !== null && (
          <p className="mt-3 text-[12px] leading-relaxed text-content/55">
            Para não ter prejuízo este mês, é preciso vender pelo menos{" "}
            <strong>{brl(d.pontoEquilibrioCents)}</strong>. É o ponto de equilíbrio: os gastos fixos
            divididos pela margem que cada venda deixa.
          </p>
        )}
      </section>

      <section className="border border-content/15 px-5 py-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/60">Resultado do mês</p>
        <Linha rotulo="Vendas" valor={d.receitaBrutaCents} sinal="+" />
        <Linha rotulo="Estornos a clientes" valor={d.estornosCents} sinal="−" />
        <Linha rotulo="Receita líquida" valor={d.receitaLiquidaCents} sinal="=" forte />
        <Linha rotulo="Custo das peças vendidas" valor={d.cmvCents} sinal="−" dica="O custo de cada peça que saiu, não o estoque comprado." />
        <Linha rotulo="Lucro bruto" valor={d.lucroBrutoCents} sinal="=" forte />
        <Linha
          rotulo="Gastos que crescem com a venda"
          valor={d.variaveisCents}
          sinal="−"
          dica="Taxa do Mercado Pago, etiquetas, embalagem."
        />
        <Linha
          rotulo={`Margem de contribuição${d.margemPermil !== null ? ` (${pct(d.margemPermil)})` : ""}`}
          valor={d.margemContribuicaoCents}
          sinal="="
          forte
          dica="O que cada venda deixa para pagar os gastos fixos."
        />
        <Linha rotulo="Gastos fixos" valor={d.fixasCents} sinal="−" dica="Anúncios, sistemas, serviços e outros." />
        <Linha rotulo="Imposto (DAS do MEI)" valor={d.impostosCents} sinal="−" />
        <div className={`mt-1 flex items-baseline justify-between border-t-2 border-content/30 pt-3`}>
          <p className="text-sm uppercase tracking-[0.15em]">{lucro ? "Lucro" : "Prejuízo"}</p>
          <p className="text-xl">{brl(d.resultadoCents)}</p>
        </div>
        {(d.foraDoResultado.estoqueCents > 0 || d.foraDoResultado.investimentoCents > 0) && (
          <p className="mt-4 text-[11px] leading-relaxed text-content/45">
            Ficaram fora do resultado, de propósito:{" "}
            {d.foraDoResultado.estoqueCents > 0 && `${brl(d.foraDoResultado.estoqueCents)} em compra de estoque (vira custo quando a peça é vendida)`}
            {d.foraDoResultado.estoqueCents > 0 && d.foraDoResultado.investimentoCents > 0 && " e "}
            {d.foraDoResultado.investimentoCents > 0 && `${brl(d.foraDoResultado.investimentoCents)} em equipamento (é investimento, dura anos)`}
            . Eles aparecem no caixa abaixo, porque o dinheiro saiu.
          </p>
        )}
      </section>

      <section className="border border-content/15 px-5 py-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/60">Caixa no mês</p>
        <Linha rotulo="Saldo no começo do mês" valor={f.caixa.inicialCents} />
        <Linha rotulo="Entrou" valor={f.caixa.entradasCents} sinal="+" />
        <Linha rotulo="Saiu" valor={f.caixa.saidasCents} sinal="−" />
        <Linha rotulo="Saldo no fim do mês" valor={f.caixa.finalCents} sinal="=" forte />
        <p className="mt-3 text-[11px] leading-relaxed text-content/45">
          Lucro e caixa são números diferentes. O lucro diz se as vendas pagaram os custos; o caixa
          diz quanto dinheiro a empresa tem. Comprar estoque derruba o caixa sem ser prejuízo, e um
          aporte de sócio aumenta o caixa sem ser lucro.
        </p>
      </section>

      {f.porModelo.length > 0 && (
        <section>
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/60">Por modelo</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-content/10 text-[10px] uppercase tracking-[0.1em] text-content/50">
                  <th className="py-2.5 pr-3 font-normal">Modelo</th>
                  <th className="py-2.5 pr-3 font-normal">Peças</th>
                  <th className="py-2.5 pr-3 font-normal">Entrou</th>
                  <th className="py-2.5 pr-3 font-normal">Custo</th>
                  <th className="py-2.5 font-normal">Sobrou por peça</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-content/10">
                {f.porModelo.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 pr-3">{m.nome}</td>
                    <td className="py-2.5 pr-3 text-content/70">{m.qtd}</td>
                    <td className="py-2.5 pr-3 text-content/70">{brl(m.receitaCents)}</td>
                    <td className="py-2.5 pr-3 text-content/70">{m.custoCents === null ? "sem custo" : brl(m.custoCents)}</td>
                    <td className="py-2.5">{m.sobraCents === null ? "·" : brl(Math.round(m.sobraCents / m.qtd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-content/40">
            Preço menos o custo da peça. Taxa e frete são do pedido inteiro e entram no resultado do mês.
          </p>
        </section>
      )}
    </div>
  );
}
