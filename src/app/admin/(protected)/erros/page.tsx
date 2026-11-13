import Link from "next/link";
import { listarErros } from "@/lib/erros";
import { ROTULO_AREA, ROTULO_GRAVIDADE, type Area, type Gravidade } from "@/lib/erros-regras";
import { CopiarErro, LimparErros, ResolverErro } from "./Botoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Erros do sistema · Painel ALBIZIA" };

// Tudo que deu erro no sistema, do mais novo para o mais antigo, com
// gravidade e área. Críticos e altos chegam também por e-mail na hora.

const COR: Record<string, string> = {
  critica: "bg-red-600 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-yellow-400 text-black",
  baixa: "bg-content/15 text-content",
};

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function ErrosPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filtro = { gravidade: um(sp.gravidade), area: um(sp.area), abertos: um(sp.todos) !== "1" };
  const { erros, pronto } = await listarErros(300, filtro);
  const link = (mudar: Record<string, string>) => {
    const p = new URLSearchParams({ gravidade: filtro.gravidade, area: filtro.area, todos: filtro.abertos ? "" : "1", ...mudar });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/admin/erros${p.toString() ? `?${p}` : ""}`;
  };
  const chip = (ativo: boolean) =>
    ativo ? "bg-content px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-surface" : "btn-sec min-h-0! px-3! py-1.5!";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Erros do sistema</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Tudo que deu erro na loja, na compra, no pagamento, no cadastro, no estoque, no frete, nos e-mails e no painel.
          <strong> Crítico</strong> e <strong>alto</strong> chegam por e-mail na hora. Médio vai num resumo diário às 10h.
          Baixo fica só aqui. Toque em <strong>Copiar</strong> para mandar ao suporte e em <strong>Resolvido</strong> quando
          estiver corrigido.
        </p>
      </div>

      {!pronto && <p className="border-2 border-content px-4 py-3 text-[14px]">Não consegui ler os erros agora. Atualize a página.</p>}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Link href={link({ gravidade: "" })} className={chip(!filtro.gravidade)}>Todas</Link>
          {(["critica", "alta", "media", "baixa"] as Gravidade[]).map((g) => (
            <Link key={g} href={link({ gravidade: g })} className={chip(filtro.gravidade === g)}>
              {ROTULO_GRAVIDADE[g]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={link({ area: "" })} className={chip(!filtro.area)}>Todas as áreas</Link>
          {(Object.keys(ROTULO_AREA) as Area[]).map((a) => (
            <Link key={a} href={link({ area: a })} className={chip(filtro.area === a)}>
              {ROTULO_AREA[a]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={link({ todos: filtro.abertos ? "1" : "" })} className="btn-sec">
            {filtro.abertos ? "Mostrar também os resolvidos" : "Mostrar só os em aberto"}
          </Link>
          {erros.length > 0 && <LimparErros />}
        </div>
      </div>

      {pronto && erros.length === 0 && (
        <p className="py-8 text-center text-[14px] text-content/60">Nenhum erro {filtro.abertos ? "em aberto " : ""}com esses filtros.</p>
      )}

      <ul className="flex flex-col gap-2">
        {erros.map((e) => {
          const g = (e.gravidade || "media") as Gravidade;
          const texto = [
            `Quando: ${quando(e.criadoEm)}`,
            `Gravidade: ${ROTULO_GRAVIDADE[g]} · Área: ${ROTULO_AREA[e.area as Area] ?? e.area}`,
            `Onde: ${e.origem === "servidor" ? "servidor" : "aparelho"} · ${e.caminho}`,
            `Mensagem: ${e.mensagem}`,
            e.codigo && `Código: ${e.codigo}`,
            e.usuario && `Usuário: ${e.usuario}`,
            e.aparelho && `Aparelho: ${e.aparelho}`,
            e.detalhe && `Detalhe:\n${e.detalhe}`,
          ]
            .filter(Boolean)
            .join("\n");
          return (
            <li key={e.id} className={`border px-4 py-3 ${e.resolvido ? "border-content/15 opacity-60" : "border-content/30"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${COR[g]}`}>{ROTULO_GRAVIDADE[g]}</span>
                    <span className="font-medium">{ROTULO_AREA[e.area as Area] ?? (e.area || "Sem área")}</span>
                    <span className="text-content/60">{quando(e.criadoEm)}</span>
                    {e.notificado && <span className="text-content/60">· e-mail enviado</span>}
                    {e.resolvido && <span className="text-content/60">· resolvido</span>}
                  </p>
                  <p className="mt-1 break-words text-[14px]">{e.mensagem}</p>
                  <p className="mt-0.5 break-all text-[12px] text-content/55">{e.caminho}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <CopiarErro texto={texto} />
                  {!e.resolvido && <ResolverErro id={e.id} />}
                </div>
              </div>
              {e.detalhe && (
                <details className="mt-2">
                  <summary className="btn-sec cursor-pointer list-none">Ver detalhe técnico</summary>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all bg-content/5 p-3 text-[11px]">{e.detalhe}</pre>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
