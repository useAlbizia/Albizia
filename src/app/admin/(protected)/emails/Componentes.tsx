"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useTransition } from "react";
import {
  baixarAnexo,
  enviarEmail,
  esvaziarLixeira,
  marcar,
  moverParaLixeira,
  restaurar,
  type EnvioState,
} from "./_actions";

const botao = "btn-sec";

export function AcoesEmail({
  id,
  importante,
  arquivado,
  spam,
  naLixeira,
  recebido,
}: {
  id: string;
  importante: boolean;
  arquivado: boolean;
  spam: boolean;
  naLixeira: boolean;
  recebido: boolean;
}) {
  const [pend, start] = useTransition();
  const router = useRouter();
  const fazer = (f: () => Promise<void>, voltar = false) =>
    start(async () => {
      await f();
      if (voltar) router.push("/admin/emails");
    });

  if (naLixeira) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => restaurar(id))}>
          Restaurar
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => marcar(id, "importante", !importante))}>
        {importante ? "Tirar estrela" : "Importante"}
      </button>
      {recebido && (
        <>
          <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => marcar(id, "arquivado", !arquivado), !arquivado)}>
            {arquivado ? "Voltar para a entrada" : "Arquivar"}
          </button>
          <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => marcar(id, "spam", !spam), !spam)}>
            {spam ? "Não é spam" : "Spam"}
          </button>
          <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => marcar(id, "lido", false), true)}>
            Marcar não lido
          </button>
        </>
      )}
      <button type="button" disabled={pend} className={botao} onClick={() => fazer(() => moverParaLixeira(id), true)}>
        Excluir
      </button>
    </div>
  );
}

export function EsvaziarLixeira() {
  const [pend, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pend}
      className={botao}
      onClick={() => {
        if (confirm("Apagar de vez tudo que está na lixeira? Não dá para desfazer.")) start(() => esvaziarLixeira());
      }}
    >
      Esvaziar lixeira
    </button>
  );
}

export function Anexos({ mensagemId, anexos }: { mensagemId: string; anexos: { id: string; nome: string; tamanho: number | null }[] }) {
  const [pend, start] = useTransition();
  if (!anexos.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {anexos.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={pend}
          className={botao}
          onClick={() =>
            start(async () => {
              // O link vem na hora e expira: nada de anexo exposto em URL fixa.
              const url = await baixarAnexo(mensagemId, a.id);
              if (url) window.open(url, "_blank", "noopener");
              else alert("Não foi possível baixar este anexo agora.");
            })
          }
        >
          {a.nome}
          {a.tamanho ? ` · ${Math.max(1, Math.round(a.tamanho / 1024))} KB` : ""}
        </button>
      ))}
    </div>
  );
}

/**
 * O corpo de um e-mail recebido.
 *
 * HTML de fora abre num quadro ISOLADO: sem permissão para rodar código, sem
 * acesso ao painel, e links abrem em outra aba. Um e-mail malicioso não
 * consegue fazer nada dentro do painel. É o mesmo cuidado do Gmail.
 */
export function CorpoEmail({ html, texto }: { html: string | null; texto: string | null }) {
  if (html) {
    return (
      <iframe
        title="Conteúdo do e-mail"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        className="h-[60vh] w-full border border-content/10 bg-white"
        srcDoc={`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>body{margin:14px;font-family:Arial,Helvetica,sans-serif;color:#202124;font-size:15px;line-height:1.55;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${html}</body></html>`}
      />
    );
  }
  return <pre className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-content/85">{texto ?? "(sem conteúdo)"}</pre>;
}

const input = "border border-content/30 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-content";

export function Escrever({
  para,
  assunto,
  respondendoA,
}: {
  para?: string;
  assunto?: string;
  respondendoA?: string;
}) {
  const [state, action, pending] = useActionState<EnvioState, FormData>(enviarEmail, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.push("/admin/emails?pasta=enviados");
  }, [state.ok, router]);

  return (
    <form action={action} className="flex flex-col gap-2">
      {respondendoA && <input type="hidden" name="respondendoA" value={respondendoA} />}
      <input name="para" type="email" required defaultValue={para} placeholder="Para" className={input} autoComplete="off" />
      <input name="assunto" required defaultValue={assunto} placeholder="Assunto" className={input} />
      <textarea name="texto" required rows={8} placeholder="Mensagem" className={`${input} resize-y`} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border border-content bg-content px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] text-surface disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar"}
        </button>
        <span className="text-[11px] text-content/45">Sai como contato@usealbizia.com.br</span>
        {state.error && <span className="text-[12px] text-content/80">{state.error}</span>}
      </div>
    </form>
  );
}
