import type { Instrumentation } from "next";

// Todo erro do servidor (tela que falhou, ação com erro, rota da API) é
// gravado para a tela "Erros do sistema" do painel. O Next.js chama isto
// sozinho quando captura um erro.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const e = err as { message?: string; stack?: string; digest?: string };
  const mensagem = e?.message ?? String(err);
  const { registrarErro, tipoDoErro } = await import("./lib/erros");
  const padrao = context.routeType === "action" ? "acao" : context.routeType === "route" ? "rota" : "tela";
  await registrarErro({
    origem: "servidor",
    tipo: tipoDoErro(`${mensagem} ${e?.stack ?? ""}`, padrao),
    caminho: `${request.method} ${request.path}`,
    mensagem,
    detalhe: e?.stack ?? "",
    codigo: e?.digest ?? "",
  });
};
