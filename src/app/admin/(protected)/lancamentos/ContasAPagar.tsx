"use client";

import { useMemo, useState } from "react";
import { PagarParte } from "./PagarParte";

// Contas a pagar, pensado para o celular: um resumo de uma linha e três abas.
// - Atrasadas: o que já venceu e ninguém marcou.
// - Hoje: o que vence hoje.
// - Calendário: o mês em grade; um ponto marca o dia com conta. Toca no dia
//   e aparece só o que vence nele, com o botão Pagar.
// Nada de lista comprida para rolar.

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

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dias = (de: string, ate: string) =>
  Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function Linha({ c, hoje }: { c: Conta; hoje: string }) {
  const atraso = dias(c.vencimento, hoje);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="text-[14px]">
          <span className="font-medium">{c.vencimento.slice(8, 10)}/{c.vencimento.slice(5, 7)}</span> · {c.descricao}
          {c.parcela && <span className="text-content/55"> {c.parcela}</span>}
        </p>
        <p className="text-[12px] text-content/65">
          {c.minha ? <strong className="text-content">Sua parte</strong> : c.socioId ? `Parte de ${c.nome}` : "Empresa"} ·{" "}
          {brl(c.valorCents)}
          {atraso > 0 && <strong className="text-content"> · {atraso} {atraso === 1 ? "dia" : "dias"} de atraso</strong>}
        </p>
      </div>
      <PagarParte pagadorId={c.pagadorId} pagoEm={null} hoje={hoje} rotulo={`Pagar ${brl(c.valorCents)}`} />
    </li>
  );
}

function Lista({ contas, hoje, vazio }: { contas: Conta[]; hoje: string; vazio: string }) {
  if (contas.length === 0) return <p className="py-4 text-[13px] text-content/60">{vazio}</p>;
  // As do próprio sócio primeiro: é o que ele precisa resolver.
  const ordem = [...contas].sort((a, b) => Number(b.minha) - Number(a.minha) || a.vencimento.localeCompare(b.vencimento));
  return (
    <ul className="divide-y divide-content/10">
      {ordem.map((c) => (
        <Linha key={c.pagadorId} c={c} hoje={hoje} />
      ))}
    </ul>
  );
}

function Aba({ ativo, onClick, rotulo, n }: { ativo: boolean; onClick: () => void; rotulo: string; n?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex-1 border-b-2 px-2 py-2.5 text-[12px] font-medium uppercase tracking-[0.08em] ${
        ativo ? "border-content text-content" : "border-transparent text-content/60"
      }`}
    >
      {rotulo}
      {n !== undefined && n > 0 && (
        <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-content px-1.5 text-[11px] text-surface">
          {n}
        </span>
      )}
    </button>
  );
}

export function ContasAPagar({ contas, hoje }: { contas: Conta[]; hoje: string }) {
  const atrasadas = contas.filter((c) => c.vencimento < hoje);
  const deHoje = contas.filter((c) => c.vencimento === hoje);
  const em30 = contas.filter((c) => c.vencimento > hoje && dias(hoje, c.vencimento) <= 30);
  const [aba, setAba] = useState<"atrasadas" | "hoje" | "calendario">(
    atrasadas.length ? "atrasadas" : deHoje.length ? "hoje" : "calendario",
  );
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const [dia, setDia] = useState<string | null>(null);

  const porDia = useMemo(() => {
    const m = new Map<string, Conta[]>();
    for (const c of contas) m.set(c.vencimento, [...(m.get(c.vencimento) ?? []), c]);
    return m;
  }, [contas]);

  if (contas.length === 0) return null;

  // Grade do mês: começa no domingo da primeira semana.
  const [a, mm] = mes.split("-").map(Number);
  const primeiro = new Date(Date.UTC(a, mm - 1, 1));
  const diasNoMes = new Date(Date.UTC(a, mm, 0)).getUTCDate();
  const vazios = primeiro.getUTCDay();
  const celulas = [...Array(vazios).fill(null), ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];
  const nomeMes = primeiro.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const mudarMes = (n: number) => {
    const d = new Date(Date.UTC(a, mm - 1 + n, 1));
    setMes(d.toISOString().slice(0, 7));
    setDia(null);
  };
  const totalMes = contas.filter((c) => c.vencimento.startsWith(mes)).reduce((n, c) => n + c.valorCents, 0);

  return (
    <section id="contas" data-tour="contas" className="scroll-mt-6 border-[1.5px] border-content">
      <div className="px-4 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">Contas a pagar</p>
        <p className="mt-1 text-[13px] text-content/75">
          {atrasadas.length > 0 && (
            <strong className="text-content">
              {atrasadas.length} {atrasadas.length === 1 ? "atrasada" : "atrasadas"} ·{" "}
            </strong>
          )}
          {deHoje.length > 0 ? `${deHoje.length} vence${deHoje.length === 1 ? "" : "m"} hoje · ` : ""}
          {em30.length} nos próximos 30 dias
        </p>
      </div>
      <div className="mt-2 flex border-b border-content/15 px-2">
        <Aba ativo={aba === "atrasadas"} onClick={() => setAba("atrasadas")} rotulo="Atrasadas" n={atrasadas.length} />
        <Aba ativo={aba === "hoje"} onClick={() => setAba("hoje")} rotulo="Hoje" n={deHoje.length} />
        <Aba ativo={aba === "calendario"} onClick={() => setAba("calendario")} rotulo="Calendário" />
      </div>

      <div className="px-4 pb-3">
        {aba === "atrasadas" && <Lista contas={atrasadas} hoje={hoje} vazio="Nenhuma conta atrasada." />}
        {aba === "hoje" && <Lista contas={deHoje} hoje={hoje} vazio="Nada vence hoje." />}
        {aba === "calendario" && (
          <div className="pt-3">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => mudarMes(-1)} className="btn-sec px-3!" aria-label="Mês anterior">
                ‹
              </button>
              <div className="text-center">
                <p className="text-[14px] font-medium capitalize">{nomeMes}</p>
                {totalMes > 0 && <p className="text-[11px] text-content/60">{brl(totalMes)} no mês</p>}
              </div>
              <button type="button" onClick={() => mudarMes(1)} className="btn-sec px-3!" aria-label="Próximo mês">
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] text-content/55">
              {SEMANA.map((d, i) => (
                <span key={i} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celulas.map((n, i) => {
                if (n === null) return <span key={`v${i}`} />;
                const d = `${mes}-${String(n).padStart(2, "0")}`;
                const cs = porDia.get(d) ?? [];
                const temMinha = cs.some((c) => c.minha);
                const atrasado = cs.length > 0 && d < hoje;
                const sel = dia === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDia(cs.length ? d : null)}
                    className={`relative flex aspect-square flex-col items-center justify-center text-[14px] ${
                      sel ? "bg-content text-surface" : d === hoje ? "border-[1.5px] border-content" : ""
                    } ${cs.length ? "font-semibold" : "text-content/60"}`}
                    aria-label={cs.length ? `Dia ${n}: ${cs.length} conta(s)` : `Dia ${n}`}
                  >
                    {n}
                    {cs.length > 0 && (
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                          sel ? "bg-surface" : atrasado || temMinha ? "bg-content" : "border border-content"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-content/55">Ponto cheio: conta sua ou atrasada. Toque no dia para ver.</p>
            {dia && <Lista contas={porDia.get(dia) ?? []} hoje={hoje} vazio="" />}
          </div>
        )}
      </div>
    </section>
  );
}
