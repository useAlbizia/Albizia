"use client";

import { useActionState, useState, useTransition } from "react";
import {
  avisarRastreio,
  cancelarEtiqueta,
  comprarEtiqueta,
  linkDeclaracao,
  prepararEtiqueta,
  type EtiquetaState,
} from "./_etiqueta";

// Etiqueta do Melhor Envio, no pedido.
//
// Dois passos de propósito: PREPARAR é de graça e só confere se o Melhor
// Envio aceita o envio (é onde todo erro de endereço e medida aparece);
// COMPRAR debita da carteira. Assim dá para ver o preço antes de gastar, em
// vez de descobrir no extrato.

const vazio: EtiquetaState = {};

const botao =
  "border border-content px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50";
const botaoFraco =
  "border border-content/25 px-5 py-2.5 text-[12px] uppercase tracking-[0.15em] text-content/70 transition-colors hover:border-content hover:text-content disabled:opacity-50";

export type EtiquetaInfo = {
  orderId: string;
  pago: boolean;
  servico: string | null;
  meStatus: string | null;
  custo: string | null;
  freteCobrado: string;
  margem: string | null;
  margemNegativa: boolean;
  labelUrl: string | null;
  trackingCode: string | null;
  falta: string[];
};

function Aviso({ state }: { state: EtiquetaState }) {
  if (state.error) return <p className="text-[12px] leading-relaxed text-content/75">{state.error}</p>;
  if (state.mensagem) return <p className="text-[12px] leading-relaxed text-content/55">{state.mensagem}</p>;
  return null;
}

export function EtiquetaPanel({ info }: { info: EtiquetaInfo }) {
  const [prep, prepAction, prepando] = useActionState(prepararEtiqueta.bind(null, info.orderId), vazio);
  const [comp, compAction, comprando] = useActionState(comprarEtiqueta.bind(null, info.orderId), vazio);
  const [canc, cancAction, cancelando] = useActionState(cancelarEtiqueta.bind(null, info.orderId), vazio);
  const [rast, rastAction, avisando] = useActionState(avisarRastreio.bind(null, info.orderId), vazio);

  const [decl, setDecl] = useState<string | null>(null);
  const [declErro, setDeclErro] = useState<string | null>(null);
  const [buscandoDecl, startDecl] = useTransition();

  const noCarrinho = info.meStatus === "cart";
  const gerada = info.meStatus === "generated";

  return (
    <div className="mt-10 border border-content/15 px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Etiqueta de envio</p>

      {!info.pago && (
        <p className="mt-3 text-[12px] text-content/45">
          O pedido ainda não foi pago. A etiqueta fica disponível quando o pagamento cair.
        </p>
      )}

      {info.pago && info.falta.length > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-content/60">
          Antes de emitir, falta configurar em Entrega e frete: {info.falta.join(", ")}.
        </p>
      )}

      {info.pago && info.falta.length === 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">Serviço</p>
              <p className="mt-0.5 text-content/75">{info.servico ?? "não escolhido"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">Cliente pagou</p>
              <p className="mt-0.5 text-content/75">{info.freteCobrado}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">Etiqueta custa</p>
              <p className="mt-0.5 text-content/75">{info.custo ?? "—"}</p>
            </div>
            <div>
              {/* A diferença entre o que o cliente pagou e o que a etiqueta
                  custou. Sem ela, frete no prejuízo só aparece no fim do mês. */}
              <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">Diferença</p>
              <p className={`mt-0.5 ${info.margemNegativa ? "text-content" : "text-content/75"}`}>
                {info.margem ?? "—"}
                {info.margemNegativa ? " (prejuízo)" : ""}
              </p>
            </div>
          </div>

          {!info.meStatus || info.meStatus === "canceled" ? (
            <form action={prepAction} className="mt-5 flex flex-wrap items-center gap-4">
              <button type="submit" disabled={prepando} className={botao}>
                {prepando ? "Conferindo..." : "Preparar etiqueta"}
              </button>
              <span className="text-[11px] text-content/40">
                Não cobra nada. Só confere se o Melhor Envio aceita e mostra o preço.
              </span>
            </form>
          ) : null}

          {noCarrinho && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <form action={compAction}>
                <button type="submit" disabled={comprando} className={botao}>
                  {comprando ? "Comprando..." : `Comprar e gerar${info.custo ? ` · ${info.custo}` : ""}`}
                </button>
              </form>
              <form action={cancAction}>
                <button type="submit" disabled={cancelando} className={botaoFraco}>
                  {cancelando ? "..." : "Descartar"}
                </button>
              </form>
              <span className="text-[11px] text-content/40">Comprar debita da Melhor Carteira.</span>
            </div>
          )}

          {gerada && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {info.labelUrl && (
                <a href={info.labelUrl} target="_blank" rel="noopener noreferrer" className={botao}>
                  Imprimir etiqueta
                </a>
              )}
              <button
                type="button"
                disabled={buscandoDecl}
                onClick={() =>
                  startDecl(async () => {
                    setDeclErro(null);
                    const r = await linkDeclaracao(info.orderId);
                    if (r.url) {
                      setDecl(r.url);
                      window.open(r.url, "_blank", "noopener");
                    } else {
                      setDeclErro(r.error ?? "Não foi possível obter a declaração.");
                    }
                  })
                }
                className={botaoFraco}
              >
                {buscandoDecl ? "..." : "Declaração de conteúdo"}
              </button>
              <form action={cancAction}>
                <button type="submit" disabled={cancelando} className={botaoFraco}>
                  {cancelando ? "..." : "Cancelar etiqueta"}
                </button>
              </form>
            </div>
          )}

          {decl && (
            <p className="mt-2 text-[11px] text-content/40">
              Declaração aberta em outra aba.{" "}
              <a href={decl} target="_blank" rel="noopener noreferrer" className="underline">
                abrir de novo
              </a>
            </p>
          )}
          {declErro && <p className="mt-2 text-[12px] text-content/75">{declErro}</p>}

          {gerada && (
            <form action={rastAction} className="mt-6 border-t border-content/10 pt-5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-content/40">
                Avisar o cliente
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  name="codigo"
                  defaultValue={info.trackingCode ?? ""}
                  placeholder="Código de rastreio da etiqueta"
                  className="flex-1 border border-content/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-content"
                />
                <button type="submit" disabled={avisando} className={botao}>
                  {avisando ? "..." : "Marcar enviado e avisar"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-content/40">
                O cliente recebe um e-mail com botão de rastrear, não só o código solto.
              </p>
            </form>
          )}

          <div className="mt-3 flex flex-col gap-1">
            <Aviso state={prep} />
            <Aviso state={comp} />
            <Aviso state={canc} />
            <Aviso state={rast} />
          </div>
        </>
      )}
    </div>
  );
}
