import { listarErros } from "@/lib/erros";
import { CopiarErro, LimparErros } from "./Botoes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Erros do sistema · Painel ALBIZIA" };

// Tudo que deu erro no sistema, do mais novo para o mais antigo. Para o
// sócio ver o que aconteceu e mandar para quem cuida do código: cada erro
// tem um botão que copia o texto completo.

const ROTULO: Record<string, string> = {
  banco: "Banco de dados",
  tela: "Tela",
  acao: "Botão / ação",
  rota: "Integração",
  navegador: "Aparelho",
};

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function ErrosPage() {
  const { erros, pronto } = await listarErros(200);
  const ultimas24h = erros.filter((e) => Date.now() - e.criadoEm.getTime() < 86_400_000).length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Erros do sistema</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Tudo que deu erro, no servidor ou no aparelho de quem usa o painel. Se algo travou ou não abriu, procure aqui pelo
          horário, toque em <strong>Copiar</strong> e mande para o suporte.
        </p>
      </div>

      {!pronto && (
        <p className="border-2 border-content px-4 py-3 text-[14px]">
          Falta aplicar a atualização do banco (npm run db:migrate) para os erros começarem a ser guardados.
        </p>
      )}

      {pronto && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-content/20 px-4 py-3">
          <p className="text-[14px]">
            <strong>{ultimas24h}</strong> {ultimas24h === 1 ? "erro" : "erros"} nas últimas 24 horas · {erros.length} no total
          </p>
          {erros.length > 0 && <LimparErros />}
        </div>
      )}

      {pronto && erros.length === 0 && <p className="py-8 text-center text-[14px] text-content/60">Nenhum erro registrado.</p>}

      <ul className="flex flex-col gap-2">
        {erros.map((e) => {
          const texto = [
            `Quando: ${quando(e.criadoEm)}`,
            `Onde: ${e.origem === "servidor" ? "servidor" : "aparelho"} · ${ROTULO[e.tipo] ?? e.tipo} · ${e.caminho}`,
            `Mensagem: ${e.mensagem}`,
            e.codigo && `Código: ${e.codigo}`,
            e.usuario && `Usuário: ${e.usuario}`,
            e.aparelho && `Aparelho: ${e.aparelho}`,
            e.detalhe && `Detalhe:\n${e.detalhe}`,
          ]
            .filter(Boolean)
            .join("\n");
          return (
            <li key={e.id} className="border border-content/20 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[12px] text-content/65">
                    {quando(e.criadoEm)} ·{" "}
                    <strong className="text-content">{ROTULO[e.tipo] ?? e.tipo}</strong> ·{" "}
                    {e.origem === "servidor" ? "servidor" : "aparelho"}
                  </p>
                  <p className="mt-1 break-words text-[14px]">{e.mensagem}</p>
                  <p className="mt-0.5 break-all text-[12px] text-content/55">{e.caminho}</p>
                </div>
                <CopiarErro texto={texto} />
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
