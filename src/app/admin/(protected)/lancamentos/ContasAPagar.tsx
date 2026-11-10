import { brl } from "@/lib/format";
import { PagarParte } from "./PagarParte";

// O calendário de contas a pagar. Cada linha é a parte de UMA pessoa numa
// parcela ou conta fixa, com o botão Pagar dela. Atrasadas primeiro, numa
// caixa de borda grossa; depois os três próximos meses; o resto fica dobrado.
// A data vem grande à esquerda, como numa agenda, para quem é ruim de data.

type Conta = {
  pagadorId: string;
  descricao: string;
  parcela: string;
  vencimento: string;
  valorCents: number;
  socioId: string | null;
  aprovacao: string;
  nome: string;
  minha: boolean;
};

const nomeMes = (ym: string) =>
  new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const diaSemana = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
const dias = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);

function Linha({ c, hoje }: { c: Conta; hoje: string }) {
  const atraso = dias(c.vencimento, hoje);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="w-11 shrink-0 text-center">
          <p className="text-[19px] font-medium leading-none">{c.vencimento.slice(8, 10)}</p>
          <p className="mt-1 text-[10px] uppercase text-content/50">{diaSemana(c.vencimento)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[14px]">
            {c.descricao}
            {c.parcela && <span className="ml-1 text-[12px] text-content/50">{c.parcela}</span>}
          </p>
          <p className="text-[12px] text-content/60">
            {c.minha ? <strong className="text-content">Sua parte</strong> : c.socioId ? `Parte de ${c.nome}` : "Empresa"} ·{" "}
            {brl(c.valorCents)}
            {atraso > 0 && (
              <strong className="text-content">
                {" "}
                · atrasada {atraso} {atraso === 1 ? "dia" : "dias"}
              </strong>
            )}
            {atraso === 0 && <strong className="text-content"> · vence hoje</strong>}
            {c.aprovacao === "pendente" && " · aguardando aprovação"}
          </p>
        </div>
      </div>
      <PagarParte pagadorId={c.pagadorId} pagoEm={null} hoje={hoje} rotulo={`Pagar ${brl(c.valorCents)}`} />
    </li>
  );
}

export function ContasAPagar({ contas, hoje }: { contas: Conta[]; hoje: string }) {
  if (contas.length === 0) return null;
  const atrasadas = contas.filter((c) => c.vencimento < hoje);
  const porMes = new Map<string, Conta[]>();
  for (const c of contas.filter((x) => x.vencimento >= hoje)) {
    const ym = c.vencimento.slice(0, 7);
    porMes.set(ym, [...(porMes.get(ym) ?? []), c]);
  }
  const meses = [...porMes.entries()];
  const total = (cs: Conta[]) => brl(cs.reduce((n, c) => n + c.valorCents, 0));

  return (
    <section id="contas" className="scroll-mt-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-content">Contas a pagar</p>
      <div className="flex flex-col gap-4">
        {atrasadas.length > 0 && (
          <div className="border-2 border-content px-4 py-2">
            <p className="flex justify-between pt-2 text-[12px] font-semibold uppercase tracking-[0.14em]">
              <span>Atrasadas ({atrasadas.length})</span>
              <span>{total(atrasadas)}</span>
            </p>
            <ul className="divide-y divide-content/10">
              {atrasadas.map((c) => (
                <Linha key={c.pagadorId} c={c} hoje={hoje} />
              ))}
            </ul>
          </div>
        )}
        {meses.slice(0, 3).map(([ym, cs]) => (
          <div key={ym} className="border border-content/15 px-4 py-2">
            <p className="flex justify-between pt-2 text-[12px] font-semibold uppercase tracking-[0.14em]">
              <span>{nomeMes(ym)}</span>
              <span className="font-normal text-content/60">{total(cs)}</span>
            </p>
            <ul className="divide-y divide-content/10">
              {cs.map((c) => (
                <Linha key={c.pagadorId} c={c} hoje={hoje} />
              ))}
            </ul>
          </div>
        ))}
        {meses.length > 3 && (
          <details className="border border-content/15 px-4 py-3">
            <summary className="cursor-pointer text-[12px] uppercase tracking-[0.14em] text-content/60">
              Meses seguintes ({meses.slice(3).reduce((n, [, cs]) => n + cs.length, 0)} contas)
            </summary>
            {meses.slice(3).map(([ym, cs]) => (
              <div key={ym} className="mt-3">
                <p className="flex justify-between text-[12px] font-semibold uppercase tracking-[0.14em]">
                  <span>{nomeMes(ym)}</span>
                  <span className="font-normal text-content/60">{total(cs)}</span>
                </p>
                <ul className="divide-y divide-content/10">
                  {cs.map((c) => (
                    <Linha key={c.pagadorId} c={c} hoje={hoje} />
                  ))}
                </ul>
              </div>
            ))}
          </details>
        )}
      </div>
    </section>
  );
}
