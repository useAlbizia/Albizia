import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { campanhasFrete } from "@/lib/db/schema";
import { ACOES, campanhaNoAr } from "@/lib/campanhas";
import { UFS } from "@/lib/regioes";
import { brl, isoDay } from "@/lib/format";
import { AcoesCampanha, NovaCampanha } from "./Componentes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campanhas por região · Painel ALBIZIA" };

const dataBr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");
const cepBr = (c: string) => (c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);

export default async function CampanhasPage() {
  const campanhas = await db.select().from(campanhasFrete).orderBy(asc(campanhasFrete.createdAt)).catch(() => []);
  const hoje = isoDay(new Date());

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Campanhas por região</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Regras de frete por estado, região ou faixa de CEP, sem editar uma a uma. Exemplos: frete grátis para o Sul em
          compras acima de R$ 200; frete 50% mais barato para RJ e SC no Dia dos Pais; R$ 2,50 a mais no frete para o
          Norte. O preço já sai certo no checkout, e o cliente vê o nome da campanha quando ela é desconto.
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-content/60">
          Várias campanhas no mesmo CEP: os acréscimos somam, e dos descontos vale o melhor para o cliente. Prazo extra
          por região fica em Ajustes, Prazos e retirada.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {campanhas.map((c) => {
          const def = ACOES.find((a) => a.v === c.acao);
          const valor = def?.unidade === "%" ? ` ${c.valor}%` : def?.unidade === "R$" ? ` ${brl(c.valor)}` : "";
          const noAr = campanhaNoAr(c, hoje);
          return (
            <li key={c.id} className={`flex flex-wrap items-start justify-between gap-3 border px-4 py-3 ${noAr ? "border-content/50" : "border-content/15"}`}>
              <div>
                <p className="text-[15px] font-medium">{c.nome}</p>
                <p className="text-[13px]">
                  {def?.rotulo.replace(/ \((%|R\$)\)/, "")}
                  {valor} · {c.tipo === "uf" ? c.ufs.join(", ") : `CEP ${cepBr(c.cepInicio)} a ${cepBr(c.cepFim)}`}
                </p>
                <p className="text-[12px] text-content/65">
                  {noAr ? "Valendo agora" : c.ativo ? "Ligada, fora do período" : "Desligada"}
                  {c.minimoCents > 0 && ` · compra mínima ${brl(c.minimoCents)}`}
                  {(c.inicio || c.fim) && ` · ${dataBr(c.inicio) || "..."} a ${dataBr(c.fim) || "..."}`}
                </p>
              </div>
              <AcoesCampanha id={c.id} ativo={c.ativo} nome={c.nome} />
            </li>
          );
        })}
      </ul>
      {campanhas.length === 0 && <p className="text-[14px] text-content/60">Nenhuma campanha ainda.</p>}

      <NovaCampanha ufs={UFS} />
    </div>
  );
}
