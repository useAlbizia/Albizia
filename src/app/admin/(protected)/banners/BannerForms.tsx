"use client";

/* eslint-disable @next/next/no-img-element -- admin banner thumbnails */
import { useActionState, useTransition } from "react";
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
  return (
    <form action={action} className="flex flex-col gap-3 border border-content/15 p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Novo banner</p>
      <input type="file" name="image" accept="image/*" required className={file} />
      <Fields />
      <div className="flex items-center gap-4">
        <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
          {pending ? "Enviando..." : "Adicionar banner"}
        </button>
        {state.ok && <span className="text-[12px] text-content/50">Criado ✓</span>}
        {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
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
            <input type="file" name="image" accept="image/*" className="hidden" />
          </label>
          <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={() => start(() => toggleBanner(banner.id, !banner.active))} disabled={busy} className="text-[11px] uppercase tracking-[0.1em] text-content/50 hover:text-content">
            {banner.active ? "Ativo" : "Inativo"}
          </button>
          <button type="button" onClick={() => start(() => deleteBanner(banner.id))} disabled={busy} className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content">
            Excluir
          </button>
          {state.ok && <span className="text-[12px] text-content/50">Salvo ✓</span>}
          {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
