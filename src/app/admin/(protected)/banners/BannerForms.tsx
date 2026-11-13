"use client";

/* eslint-disable @next/next/no-img-element -- admin banner thumbnails */
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { reduzirNoInput } from "@/lib/reduzir-imagem";
import {
  createBanner,
  updateBanner,
  toggleBanner,
  deleteBanner,
  type BannerState,
} from "./_actions";

const initial: BannerState = {};
const input =
  "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";
const file =
  "text-[12px] text-content/60 file:mr-3 file:border file:border-content/30 file:bg-transparent file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.1em] file:text-content/70";

type Banner = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  align: string;
  sortOrder: number;
  active: boolean;
};

function Fields({ b }: { b?: Banner }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="title" defaultValue={b?.title} placeholder="Título (opcional)" className={input} />
        <input name="subtitle" defaultValue={b?.subtitle} placeholder="Subtítulo (opcional)" className={input} />
        <input name="ctaLabel" defaultValue={b?.ctaLabel} placeholder="Texto do botão (ex: Comprar)" className={input} />
        <input name="ctaHref" defaultValue={b?.ctaHref} placeholder="Link do botão (ex: /produtos)" className={input} />
        <select name="align" defaultValue={b?.align ?? "center"} className={input}>
          <option value="left">Texto à esquerda</option>
          <option value="center">Texto ao centro</option>
          <option value="right">Texto à direita</option>
        </select>
      </div>
    </>
  );
}

export function AddBannerForm() {
  const [state, action, pending] = useActionState(createBanner, initial);
  const form = useRef<HTMLFormElement>(null);
  const [aviso, setAviso] = useState("");
  // Criou: limpa o formulário para o próximo e o "Criado" some sozinho
  // (antes ficava preso na tela, relato do Jair).
  useEffect(() => {
    if (!state.ok) return;
    form.current?.reset();
    setAviso("Banner criado e já está no site.");
    const t = setTimeout(() => setAviso(""), 4000);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-3 border border-content/15 p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Novo banner</p>
      <input type="file" name="image" accept="image/*" required className={file} onChange={(e) => void reduzirNoInput(e.currentTarget)} />
      <p className="text-[12px] leading-relaxed text-content/65">
        Tamanho ideal: <strong>1920 × 1080</strong> (deitada, 16:9). Foto em outro formato é cortada nesse tamanho,
        mantendo o centro da imagem. Pode mandar a foto direto do celular: ela é reduzida antes de enviar.
      </p>
      <Fields />
      <div className="flex items-center gap-4">
        <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
          {pending ? "Enviando..." : "Adicionar banner"}
        </button>
        {aviso && <span className="text-[13px] font-medium">{aviso}</span>}
        {state.error && <span className="text-[13px] font-semibold">{state.error}</span>}
      </div>
    </form>
  );
}

export function BannerEditor({ banner }: { banner: Banner }) {
  const [state, action, pending] = useActionState(updateBanner.bind(null, banner.id), initial);
  const [busy, start] = useTransition();

  return (
    <div className="flex flex-col gap-3 border border-content/15 p-5 sm:flex-row">
      <img src={banner.imageUrl} alt="" className="h-24 w-40 shrink-0 object-cover ring-1 ring-content/10" />
      <form action={action} className="flex flex-1 flex-col gap-3">
        <Fields b={banner} />
        <div className="flex flex-wrap items-center gap-3">
          <input name="sortOrder" type="number" defaultValue={banner.sortOrder} className={`${input} w-24`} title="Ordem" />
          <label className={file}>
            Trocar imagem
            <input type="file" name="image" accept="image/*" className="hidden" onChange={(e) => void reduzirNoInput(e.currentTarget)} />
          </label>
          <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          {/* Antes dizia só "Ativo/Inativo" e parecia um rótulo: um toque
              desligava o banner e ele sumia do site sem ninguém entender. */}
          <button
            type="button"
            onClick={() => start(() => toggleBanner(banner.id, !banner.active))}
            disabled={busy}
            title={banner.active ? "Tocar tira este banner do site" : "Tocar mostra este banner no site"}
            className={banner.active ? "flex items-center gap-2 bg-content px-4 py-2 text-[12px] uppercase tracking-[0.12em] text-surface" : "btn-sec"}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              {banner.active ? <circle cx="12" cy="12" r="3" /> : <path d="M4 4l16 16" />}
            </svg>
            {banner.active ? "No site" : "Fora do site: tocar para mostrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Excluir este banner? Não dá para desfazer.")) start(() => deleteBanner(banner.id));
            }}
            disabled={busy}
            className="btn-perigo"
          >
            Excluir
          </button>
          {state.ok && <span className="text-[12px] text-content/50">Salvo ✓</span>}
          {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
