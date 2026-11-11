import { lerRetirada, listarRegrasPrazo } from "@/lib/regioes-db";
import { NOME_UF, UFS } from "@/lib/regioes";
import { AcoesRegra, NovaRegra, RetiradaForm } from "./Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prazos e retirada · Painel ALBIZIA" };

const cepBr = (c: string) => (c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);

export default async function PrazosPage() {
  const [regras, retirada] = await Promise.all([listarRegrasPrazo(), lerRetirada()]);

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Prazos e retirada</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Some dias ao prazo de entrega de uma região, sem mexer no código. Exemplo: Rio de Janeiro com +1 dia. O
          cliente já vê o prazo novo no checkout. Se duas regras valem para o mesmo CEP, vale a de mais dias.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Prazo por região</p>
        {regras.length === 0 && <p className="text-[14px] text-content/60">Nenhuma regra ainda.</p>}
        <ul className="flex flex-col gap-2">
          {regras.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-3 border px-4 py-3 ${
                r.ativo ? "border-content/40" : "border-content/15 opacity-60"
              }`}
            >
              <div>
                <p className="text-[15px] font-medium">
                  +{r.diasExtra} {r.diasExtra === 1 ? "dia" : "dias"} · {r.nome}
                </p>
                <p className="text-[12px] text-content/65">
                  {r.tipo === "uf" ? `Estado: ${NOME_UF[r.uf] ?? r.uf}` : `CEP ${cepBr(r.cepInicio)} a ${cepBr(r.cepFim)}`}
                  {!r.ativo && " · desligada"}
                </p>
              </div>
              <AcoesRegra id={r.id} ativo={r.ativo} />
            </li>
          ))}
        </ul>
        <NovaRegra ufs={UFS} nomes={NOME_UF} />
      </section>

      <section className="flex flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Retirada no local</p>
        <p className="text-[13px] leading-relaxed text-content/70">
          {retirada.ativo
            ? "Ligada: o checkout mostra a opção Retirar no local, de graça, junto das opções de frete."
            : "Desligada. Deixe o endereço preparado e ligue quando quiser: aparece no checkout como Retirar no local, de graça."}
        </p>
        <RetiradaForm {...retirada} />
      </section>
    </div>
  );
}
