"use client";

import { useActionState, useTransition } from "react";
import { BotaoExcluir } from "@/components/admin/BotaoExcluir";
import { reduzirNoInput } from "@/lib/reduzir-imagem";
import { alternarPagina, excluirPagina, salvarPagina, type PaginaState } from "./_actions";

const vazio: PaginaState = {};
const campo = "w-full border-[1.5px] border-content/50 bg-transparent px-3 py-2.5 text-[16px] outline-none focus:border-content sm:text-sm";

/** O olho: liga e desliga a página no site, num toque. */
export function Olho({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => alternarPagina(id, !ativo))}
      aria-pressed={ativo}
      className={ativo ? "flex items-center gap-2 bg-content px-4 py-2.5 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        {ativo ? <circle cx="12" cy="12" r="3" /> : <path d="M4 4l16 16" />}
      </svg>
      {pending ? "..." : ativo ? "Ligada" : "Desligada"}
    </button>
  );
}

export function ExcluirPagina({ id, titulo }: { id: string; titulo: string }) {
  const [pending, start] = useTransition();
  return <BotaoExcluir oQue={`a página "${titulo}"`} disabled={pending} onConfirmar={() => start(() => excluirPagina(id))} />;
}

export function FormPagina(props: {
  id?: string;
  titulo?: string;
  slug?: string;
  subtitulo?: string;
  texto?: string;
  imagemUrl?: string;
  produtos?: string[];
  inicio?: string | null;
  fim?: string | null;
  catalogo: { slug: string; nome: string }[];
}) {
  const [state, action, pending] = useActionState(salvarPagina.bind(null, props.id ?? null), vazio);
  const marcados = new Set(props.produtos ?? []);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="titulo" defaultValue={props.titulo} placeholder="Título (ex.: Dia das Mães)" className={campo} required />
      <input name="subtitulo" defaultValue={props.subtitulo} placeholder="Frase curta (opcional)" className={campo} />
      <textarea name="texto" defaultValue={props.texto} placeholder="Texto da página (opcional)" rows={3} className={campo} />
      <label className="flex flex-col gap-1 text-[13px]">
        Endereço da página
        <span className="flex items-center gap-1 text-[14px]">
          usealbizia.com.br/especial/
          <input name="slug" defaultValue={props.slug} placeholder="dia-das-maes" className={`${campo} flex-1`} />
        </span>
        <span className="text-[12px] text-content/60">Em branco, é criado a partir do título.</span>
      </label>
      <label className="flex flex-col gap-1 text-[13px]">
        Imagem de capa {props.imagemUrl ? "(escolha outra para trocar)" : ""}
        <input type="file" name="imagem" accept="image/*" className="text-[13px]" onChange={(e) => void reduzirNoInput(e.currentTarget)} />
        <span className="text-[12px] text-content/60">Ideal 1920 × 1080, deitada. Pode ser foto do celular.</span>
      </label>
      {props.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.imagemUrl} alt="" className="aspect-[16/9] w-full max-w-sm object-cover" />
      )}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-[13px]">Produtos em destaque</legend>
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto border border-content/20 p-2 sm:grid-cols-2">
          {props.catalogo.map((p) => (
            <label key={p.slug} className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" name="produtos" value={p.slug} defaultChecked={marcados.has(p.slug)} className="h-4 w-4 accent-content" />
              {p.nome}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px]">
          Ligar sozinha em (opcional)
          <input type="date" name="inicio" defaultValue={props.inicio ?? ""} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-[13px]">
          Desligar sozinha depois de (opcional)
          <input type="date" name="fim" defaultValue={props.fim ?? ""} className={campo} />
        </label>
      </div>
      <p className="text-[12px] leading-relaxed text-content/60">
        A página só aparece com o olho <strong>ligado</strong>. Com datas, ela também respeita o período: ligada e com
        &quot;01/05 a 10/05&quot;, aparece no dia 1º e some depois do dia 10, sozinha.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="bg-content px-5 py-3 text-[12px] uppercase tracking-[0.15em] text-surface disabled:opacity-50">
          {pending ? "Salvando..." : props.id ? "Salvar" : "Criar página"}
        </button>
        {state.ok && <span className="text-[13px]">{state.ok}</span>}
        {state.erro && <span className="text-[13px] font-semibold">{state.erro}</span>}
      </div>
    </form>
  );
}
