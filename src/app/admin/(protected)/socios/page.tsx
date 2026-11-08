import Link from "next/link";
import { brl } from "@/lib/format";
import { listarSocios, painelFinanceiro } from "@/lib/financeiro";
import { SocioForm } from "./SocioForm";

export const dynamic = "force-dynamic";

function Cartao({ titulo, valor, dica }: { titulo: string; valor: string; dica?: string }) {
  return (
    <div className="border border-content/15 px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-content/45">{titulo}</p>
      <p className="mt-1 text-2xl font-light">{valor}</p>
      {dica && <p className="mt-1 text-[11px] leading-relaxed text-content/40">{dica}</p>}
    </div>
  );
}

export default async function SociosPage() {
  const [{ resumo, acertos, mei }, lista] = await Promise.all([painelFinanceiro(), listarSocios()]);
  const { caixa } = resumo;
  const usoMei = mei.limiteCents > 0 ? Math.min(100, (mei.faturadoCents / mei.limiteCents) * 100) : 0;
  const ativos = resumo.socios.filter((l) => lista.find((s) => s.id === l.id)?.ativo);
  const fracao = ativos.length ? `1/${ativos.length}` : "";

  return (
    <div className="flex max-w-5xl flex-col gap-12">
      <div>
        <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Sócios e caixa</h1>
        <p className="max-w-2xl text-[12px] leading-relaxed text-content/45">
          Tudo aqui é calculado a partir dos lançamentos, nunca digitado. Para mudar um número, lance
          ou corrija em{" "}
          <Link href="/admin/lancamentos" className="underline underline-offset-4">
            Lançamentos
          </Link>
          .
        </p>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao
          titulo="Caixa da empresa"
          valor={brl(caixa.saldoCents)}
          dica="O dinheiro que é da empresa agora: entrou menos o que a própria empresa pagou."
        />
        <Cartao
          titulo="Capital investido pelos sócios"
          valor={brl(resumo.capitalTotalCents)}
          dica="Tudo que saiu do bolso de vocês para a empresa, menos o que já foi devolvido."
        />
        <Cartao
          titulo="Gasto total da empresa"
          valor={brl(resumo.despesasTotalCents)}
          dica="Todas as despesas pagas, por quem quer que tenha pago."
        />
      </section>

      <section>
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/60">Cada sócio</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-content/10 text-[10px] uppercase tracking-[0.1em] text-content/50">
                <th className="py-2.5 pr-4 font-normal">Sócio</th>
                <th className="py-2.5 pr-4 font-normal">Colocou</th>
                <th className="py-2.5 pr-4 font-normal">Já recebeu de volta</th>
                <th className="py-2.5 pr-4 font-normal">Capital hoje</th>
                <th className="py-2.5 pr-4 font-normal">Parte justa ({fracao})</th>
                <th className="py-2.5 pr-4 font-normal">Situação</th>
                <th className="py-2.5 pr-4 font-normal">Ainda vai pagar</th>
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
                    <td className="py-3 pr-4 text-content/70">{brl(l.investidoCents)}</td>
                    <td className="py-3 pr-4 text-content/70">{brl(l.devolvidoCents)}</td>
                    <td className="py-3 pr-4">{brl(l.capitalCents)}</td>
                    <td className="py-3 pr-4 text-content/70">{brl(l.parteJustaCents)}</td>
                    <td className="py-3 pr-4">
                      {l.diferencaCents === 0 ? (
                        <span className="text-content/50">equilibrado</span>
                      ) : l.diferencaCents > 0 ? (
                        <span>tem {brl(l.diferencaCents)} a receber</span>
                      ) : (
                        <span>{brl(-l.diferencaCents)} abaixo</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-content/60">
                      {l.previstoCents > 0 ? brl(l.previstoCents) : "nada"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {acertos.length > 0 && (
          <div className="mt-6 border border-content/15 px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Para equilibrar os três</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {acertos.map((a, i) => (
                <li key={i}>
                  {a.deNome} coloca <strong>{brl(a.valorCents)}</strong>, que volta para {a.paraNome}.
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-content/45">
              Há dois jeitos de fazer isso. O primeiro é quem está abaixo fazer um aporte e a empresa
              devolver o mesmo valor a quem tem a receber; aí você lança um "aporte" e uma "devolução de
              aporte", e o caixa não muda. O segundo, mais comum quando falta dinheiro, é esperar o
              lucro: as primeiras sobras do caixa voltam para quem colocou a mais, antes de qualquer
              divisão entre os três.
            </p>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="border border-content/15 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Caixa por dentro</p>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-content/60">Vendas do site recebidas</dt>
            <dd>{brl(caixa.vendasCents)}</dd>
            <dt className="text-content/60">Outras receitas</dt>
            <dd>{brl(caixa.receitasCents)}</dd>
            <dt className="text-content/60">Aportes em dinheiro dos sócios</dt>
            <dd>{brl(caixa.aportesCents)}</dd>
            <dt className="border-t border-content/10 pt-1.5">Entrou</dt>
            <dd className="border-t border-content/10 pt-1.5">{brl(caixa.entradasCents)}</dd>
            <dt className="pt-3 text-content/60">Despesas pagas pela empresa</dt>
            <dd className="pt-3">{brl(caixa.despesasEmpresaCents)}</dd>
            <dt className="text-content/60">Devolvido aos sócios</dt>
            <dd>{brl(caixa.devolucoesCents)}</dd>
            <dt className="text-content/60">Lucro distribuído</dt>
            <dd>{brl(caixa.distribuicoesCents)}</dd>
            <dt className="border-t border-content/10 pt-1.5">Saiu</dt>
            <dd className="border-t border-content/10 pt-1.5">{brl(caixa.saidasCents)}</dd>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-content/40">
            As vendas aparecem pelo valor que o cliente pagou. A taxa do Mercado Pago ainda não é
            descontada sozinha: lance como despesa até essa parte ficar automática.
            {resumo.previsto.totalCents > 0 &&
              ` Há ${brl(resumo.previsto.totalCents)} em parcelas futuras que ainda não contam aqui.`}
          </p>
        </div>

        <div className="border border-content/15 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Limite do MEI em {mei.ano}</p>
          <p className="mt-2 text-sm">
            {brl(mei.faturadoCents)} de {brl(mei.limiteCents)}
          </p>
          <div className="mt-2 h-2 w-full bg-content/10">
            <div className="h-2 bg-content" style={{ width: `${usoMei}%` }} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-content/45">
            O MEI pode faturar até {brl(mei.limiteCents)} no ano. Passando disso, a empresa precisa
            virar microempresa (ME), com outro imposto. Em 2027 o limite sobe para R$ 110 mil. Como o
            MEI não admite sócios no papel, a mudança para ME também é o caminho para os três
            constarem formalmente.
          </p>
        </div>
      </section>

      <section className="border border-content/15 px-5 py-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Como funciona, em português simples</p>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-[13px] leading-relaxed sm:grid-cols-2">
          <div>
            <dt className="font-medium">Caixa</dt>
            <dd className="text-content/60">
              O dinheiro da empresa, separado do de vocês. Toda empresa precisa de um caixa para repor
              estoque e aguentar mês fraco sem que alguém tenha que tirar do bolso de novo.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Aporte</dt>
            <dd className="text-content/60">
              Dinheiro que um sócio coloca na empresa. Conta como aporte também quando o sócio paga uma
              conta da empresa com o próprio dinheiro, como o David comprando as camisetas.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Parte justa</dt>
            <dd className="text-content/60">
              Como os três são sócios iguais, cada um deveria ter colocado um terço do total. A
              diferença mostra quem colocou a mais e quem está abaixo.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Devolução de aporte</dt>
            <dd className="text-content/60">
              A empresa devolvendo para um sócio o que ele colocou a mais. Não é lucro: é o dinheiro
              dele voltando.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Lucro</dt>
            <dd className="text-content/60">
              O que sobra das vendas depois de pagar tudo: peças, frete, etiqueta, taxa do Mercado
              Pago, embalagem, anúncios e o DAS. Só esse valor pode ser dividido.
            </dd>
          </div>
          <div>
            <dt className="font-medium">Distribuição de lucro e pró-labore</dt>
            <dd className="text-content/60">
              Distribuição é dividir o lucro entre os sócios, depois de guardar uma reserva no caixa.
              Pró-labore é um valor fixo por mês para quem trabalha na empresa, como um salário, e ele
              entra como despesa. A ordem combinada por vocês: primeiro volta o que alguém colocou a
              mais, depois o lucro é dividido em partes iguais.
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/60">Cadastro dos sócios</p>
        <p className="mb-3 max-w-2xl text-[11px] leading-relaxed text-content/40">
          O WhatsApp de cada um é o que vai permitir lançar pelo celular depois. Cotas definem a
          divisão: todos com 1 é partes iguais.
        </p>
        <div className="flex flex-col gap-2">
          {lista.map((s) => (
            <SocioForm
              key={s.id}
              socio={{ id: s.id, nome: s.nome, email: s.email, telefone: s.telefone, cotas: s.cotas, ativo: s.ativo }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
