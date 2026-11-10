import Link from "next/link";
import { brl } from "@/lib/format";
import { listarSocios, painelFinanceiro, pendentePorSocio } from "@/lib/financeiro";
import { SocioForm } from "./SocioForm";
import { SincronizarMp } from "./SincronizarMp";
import { CapitalSocios } from "@/components/admin/Graficos";

export const dynamic = "force-dynamic";

// Sócios e caixa, em ordem de importância: primeiro o equilíbrio entre os
// sócios (o que todo mundo quer saber), depois o acerto exato, depois os três
// números da empresa. O resto é consulta e fica dobrado: abre ao tocar, para
// a tela não virar um paredão de texto.

function Dobra({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-content/15">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[13px] font-medium">
        {titulo}
        <span className="text-lg leading-none text-content/50 transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="pb-6">{children}</div>
    </details>
  );
}

export default async function SociosPage() {
  const [{ resumo, acertos, mei, sync }, lista, pendentes] = await Promise.all([
    painelFinanceiro(),
    listarSocios(),
    pendentePorSocio(),
  ]);
  const { caixa } = resumo;
  const usoMei = mei.limiteCents > 0 ? Math.min(100, (mei.faturadoCents / mei.limiteCents) * 100) : 0;
  const ativos = resumo.socios.filter((l) => lista.find((s) => s.id === l.id)?.ativo);

  // Participação de cada sócio ativo, em porcentagem, a partir das cotas.
  const totalCotas = lista.filter((s) => s.ativo).reduce((a, s) => a + s.cotas, 0);
  const participacao = (cotas: number) =>
    totalCotas > 0 ? `${((cotas / totalCotas) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "0%";
  const iguais = ativos.length > 0 && ativos.every((l) => l.cotas === ativos[0].cotas);
  const nAtivos = ativos.length;
  const porExtenso = ["", "um", "dois", "três", "quatro", "cinco", "seis"][nAtivos] ?? String(nAtivos);
  const fracaoIgual = { 2: "metade", 3: "um terço", 4: "um quarto" }[nAtivos] ?? `1/${nAtivos}`;
  const totalPendente = [...pendentes.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Sócios e caixa</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/55">
          Calculado a partir dos{" "}
          <Link href="/admin/lancamentos" className="underline underline-offset-4">
            lançamentos
          </Link>{" "}
          aprovados. Para mudar um número, lance ou corrija lá.
        </p>
      </div>

      {/* 1. O equilíbrio entre os sócios */}
      <div data-tour="socios-tabela">
        <CapitalSocios
          linhas={ativos.map((l) => ({
            nome: l.nome.split(" ")[0],
            capital: l.capitalCents,
            parteJusta: l.parteJustaCents,
            pendente: pendentes.get(l.id) ?? 0,
          }))}
        />
        {totalPendente > 0 && (
          <Link
            href="/admin/lancamentos?aprovar=1"
            className="mt-2 block text-[13px] text-content/70 underline underline-offset-4"
          >
            {brl(totalPendente)} lançados ainda esperam aprovação. Ver e aprovar
          </Link>
        )}
      </div>

      {/* 2. O acerto exato */}
      {acertos.length > 0 && (
        <section className="bg-content px-5 py-5 text-surface">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            {iguais ? `Para equilibrar os ${porExtenso}` : "Para cada um chegar à sua parte"}
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-[15px]">
            {acertos.map((a, i) => (
              <li key={i}>
                {a.deNome} coloca <strong>{brl(a.valorCents)}</strong>, que volta para {a.paraNome}.
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] leading-relaxed opacity-70">
            Ninguém precisa pagar isso agora. O jeito mais simples: quem está abaixo paga as próximas
            despesas até equilibrar, ou as primeiras sobras do caixa voltam para quem colocou a mais.
          </p>
        </section>
      )}

      {/* 3. Os três números da empresa */}
      <section className="grid grid-cols-3 gap-px border border-content/15 bg-content/15">
        {[
          { t: "Caixa da empresa", v: caixa.saldoCents },
          { t: "Sócios colocaram", v: resumo.capitalTotalCents },
          { t: "Gasto total", v: resumo.despesasTotalCents },
        ].map((c) => (
          <div key={c.t} className="bg-surface px-3 py-3 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-content/50">{c.t}</p>
            <p className="mt-1 text-[15px] font-medium sm:text-xl">{brl(c.v)}</p>
          </div>
        ))}
      </section>

      {/* O resto: consulta, dobrado */}
      <div className="border-b border-content/15">
        <Dobra titulo="Detalhes de cada sócio">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-content/10 text-[10px] uppercase tracking-[0.1em] text-content/50">
                  <th className="py-2.5 pr-4 font-normal">Sócio</th>
                  <th className="py-2.5 pr-4 font-normal">Colocou</th>
                  <th className="py-2.5 pr-4 font-normal">Recebeu de volta</th>
                  <th className="py-2.5 pr-4 font-normal">Parte justa</th>
                  <th className="py-2.5 pr-4 font-normal">Parcelas a vencer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-content/10">
                {resumo.socios.map((l) => {
                  const ativo = lista.find((s) => s.id === l.id)?.ativo;
                  return (
                    <tr key={l.id} className={ativo ? "" : "text-content/40"}>
                      <td className="py-3 pr-4">
                        <Link href={`/admin/lancamentos?socio=${l.id}`} className="hover:underline">
                          {l.nome}
                        </Link>
                        {!ativo && <span className="ml-1 text-[11px]">(inativo)</span>}
                      </td>
                      <td className="py-3 pr-4">{brl(l.investidoCents)}</td>
                      <td className="py-3 pr-4 text-content/70">{brl(l.devolvidoCents)}</td>
                      <td className="py-3 pr-4 text-content/70">
                        {brl(l.parteJustaCents)}
                        {ativo && <span className="ml-1 text-[11px] text-content/45">({participacao(l.cotas)})</span>}
                      </td>
                      <td className="py-3 pr-4 text-content/60">{l.previstoCents > 0 ? brl(l.previstoCents) : "nada"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-content/50">
            Parcelas a vencer passam a contar sozinhas no dia do vencimento. Toque no nome para ver os lançamentos de
            cada um.
          </p>
        </Dobra>

        <Dobra titulo="Caixa por dentro">
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-content/60">Vendas do site recebidas</dt>
            <dd>{brl(caixa.vendasCents)}</dd>
            <dt className="text-content/60">Outras receitas</dt>
            <dd>{brl(caixa.receitasCents)}</dd>
            <dt className="text-content/60">Aportes em dinheiro dos sócios</dt>
            <dd>{brl(caixa.aportesCents)}</dd>
            <dt className="border-t border-content/10 pt-1.5 font-medium">Entrou</dt>
            <dd className="border-t border-content/10 pt-1.5 font-medium">{brl(caixa.entradasCents)}</dd>
            <dt className="pt-3 text-content/60">Taxas do Mercado Pago</dt>
            <dd className="pt-3">{brl(caixa.taxasMpCents)}</dd>
            <dt className="text-content/60">Estornos a clientes</dt>
            <dd>{brl(caixa.estornosCents)}</dd>
            <dt className="text-content/60">Etiquetas do Melhor Envio</dt>
            <dd>{brl(caixa.etiquetasCents)}</dd>
            <dt className="text-content/60">Despesas pagas pela empresa</dt>
            <dd>{brl(caixa.despesasEmpresaCents)}</dd>
            <dt className="text-content/60">Devolvido aos sócios</dt>
            <dd>{brl(caixa.devolucoesCents)}</dd>
            <dt className="text-content/60">Lucro distribuído</dt>
            <dd>{brl(caixa.distribuicoesCents)}</dd>
            <dt className="border-t border-content/10 pt-1.5 font-medium">Saiu</dt>
            <dd className="border-t border-content/10 pt-1.5 font-medium">{brl(caixa.saidasCents)}</dd>
            {caixa.aLiberarCents > 0 && (
              <>
                <dt className="pt-3 text-content/60">Ainda preso no Mercado Pago</dt>
                <dd className="pt-3">{brl(caixa.aLiberarCents)}</dd>
              </>
            )}
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-content/50">
            Vendas, taxas, estornos e etiquetas entram sozinhos. O que está preso já é da empresa, mas o Mercado Pago
            só libera para saque na data dele.
          </p>
          {sync.semToken && (
            <p className="mt-2 text-[12px] text-content/75">
              A conta do Mercado Pago não está conectada, então taxas e liberações não estão sendo lidas.
            </p>
          )}
          {!sync.semToken && (sync.pendentes > 0 || sync.erros > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-[12px] text-content/70">
                {sync.pendentes > 0 && `${sync.pendentes} venda(s) ainda sem os dados do Mercado Pago. `}
                {sync.erros > 0 && `${sync.erros} leitura(s) falharam agora.`}
              </p>
              <SincronizarMp />
            </div>
          )}
        </Dobra>

        <Dobra titulo={`Limite do MEI em ${mei.ano}`}>
          <p className="text-sm">
            {brl(mei.faturadoCents)} de {brl(mei.limiteCents)}
          </p>
          <div className="mt-2 h-2 w-full bg-content/10">
            <div className="h-2 bg-content" style={{ width: `${usoMei}%` }} />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-content/50">
            O MEI pode faturar até {brl(mei.limiteCents)} no ano. Passando disso, a empresa precisa virar
            microempresa (ME), com outro imposto. Como o MEI não admite sócios no papel, a mudança para ME também é o
            caminho para os sócios constarem formalmente.
          </p>
        </Dobra>

        <Dobra titulo="Como as contas funcionam">
          <dl className="flex flex-col gap-3 text-[13px] leading-relaxed">
            <div>
              <dt className="font-medium">Parte justa</dt>
              <dd className="text-content/60">
                {iguais
                  ? `Como os ${porExtenso} são sócios iguais, cada um deveria ter colocado ${fracaoIgual} do total.`
                  : "Cada um deveria ter colocado a sua porcentagem do total, pela participação na sociedade."}{" "}
                Quem não pagou uma compra não lança nada: a parte justa de todos sobe, o capital só sobe para quem
                pagou, e quem tinha colocado mais antes vê a vantagem diminuir sozinha.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Aprovação</dt>
              <dd className="text-content/60">
                O lançamento de um sócio passa a contar quando mais um sócio aprova (a maioria). Qualquer um pode
                contestar, e aí ele trava até ser corrigido.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Caixa e aporte</dt>
              <dd className="text-content/60">
                Caixa é o dinheiro da empresa, separado do de vocês. Aporte é o dinheiro que um sócio coloca, inclusive
                quando paga uma conta da empresa do próprio bolso.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Lucro</dt>
              <dd className="text-content/60">
                O que sobra das vendas depois de pagar tudo. A ordem combinada: primeiro volta o que alguém colocou a
                mais, depois o lucro é dividido pela participação de cada um{iguais ? " (hoje, partes iguais)" : ""}.
              </dd>
            </div>
          </dl>
        </Dobra>

        <Dobra titulo="Participação e cadastro dos sócios">
          <ul className="mb-4 flex flex-col gap-1.5 text-sm">
            {lista
              .filter((s) => s.ativo)
              .map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-4">
                  <span>{s.nome}</span>
                  <span className="text-lg font-light">{participacao(s.cotas)}</span>
                </li>
              ))}
          </ul>
          <p className="mb-4 text-[12px] leading-relaxed text-content/55">
            A participação vem das cotas: todos com 1 é partes iguais; 2, 1 e 1 dá 50%, 25% e 25%. Mudar as cotas refaz
            na hora a parte justa e o acerto. Por ser decisão da sociedade, mudem só depois de combinar entre todos.
          </p>
          <div className="flex flex-col gap-2">
            {lista.map((s) => (
              <SocioForm
                key={s.id}
                socio={{ id: s.id, nome: s.nome, email: s.email, telefone: s.telefone, cotas: s.cotas, ativo: s.ativo }}
                participacao={s.ativo ? participacao(s.cotas) : "inativo"}
              />
            ))}
          </div>
        </Dobra>
      </div>
    </div>
  );
}
