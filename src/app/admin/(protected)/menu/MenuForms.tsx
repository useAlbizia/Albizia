"use client";

import { useActionState, useTransition } from "react";
import {
  createMenuItem,
  updateMenuItem,
  addMenuLink,
  deleteMenuLink,
  toggleMenuItem,
  deleteMenuItem,
  type MenuState,
} from "./_actions";

const initial: MenuState = {};
const input =
  "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

type Link = { id: string; columnTitle: string; label: string; href: string };
type Item = {
  id: string;
  label: string;
  href: string | null;
  sortOrder: number;
  active: boolean;
  featuredImageUrl: string | null;
  featuredHref: string | null;
  featuredLabel: string | null;
  links: Link[];
};

export function AddItemForm() {
  const [state, action, pending] = useActionState(createMenuItem, initial);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input name="label" placeholder="Novo item (ex: Outlet)" required className={input} />
      <input name="href" placeholder="Link (opcional, ex: /produtos)" className={`${input} min-w-[220px]`} />
      <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
        {pending ? "..." : "Adicionar item"}
      </button>
      {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
    </form>
  );
}

export function MenuItemEditor({ item }: { item: Item }) {
  const [state, action, pending] = useActionState(updateMenuItem.bind(null, item.id), initial);
  const [linkState, linkAction, linkPending] = useActionState(addMenuLink.bind(null, item.id), initial);
  const [busy, startTransition] = useTransition();

  return (
    <div className="border border-content/15 p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm uppercase tracking-[0.15em]">{item.label}</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => startTransition(() => toggleMenuItem(item.id, !item.active))}
            disabled={busy}
            className="text-[11px] uppercase tracking-[0.1em] text-content/50 hover:text-content"
          >
            {item.active ? "Ativo" : "Inativo"}
          </button>
          <button
            onClick={() => startTransition(() => deleteMenuItem(item.id))}
            disabled={busy}
            className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content"
          >
            Excluir item
          </button>
        </div>
      </div>

      <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input name="label" defaultValue={item.label} placeholder="Rótulo" className={input} />
        <input name="href" defaultValue={item.href ?? ""} placeholder="Link do item (opcional)" className={input} />
        <input name="sortOrder" type="number" defaultValue={item.sortOrder} placeholder="Ordem" className={input} />
        <div />
        <input name="featuredImageUrl" defaultValue={item.featuredImageUrl ?? ""} placeholder="Imagem destaque (URL)" className={input} />
        <input name="featuredHref" defaultValue={item.featuredHref ?? ""} placeholder="Link do destaque" className={input} />
        <input name="featuredLabel" defaultValue={item.featuredLabel ?? ""} placeholder="Texto do destaque" className={`${input} sm:col-span-2`} />
        <div className="flex items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="border border-content px-5 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar item"}
          </button>
          {state.ok && <span className="text-[12px] text-content/50">Salvo ✓</span>}
          {state.error && <span className="text-[12px] text-content/70">{state.error}</span>}
        </div>
      </form>

      {/* Links */}
      <div className="mt-5 border-t border-content/10 pt-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/40">Links do painel (submenu)</p>
        {item.links.length > 0 && (
          <div className="mb-3 divide-y divide-content/10 border-y border-content/10">
            {item.links.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-content/70">
                  {l.columnTitle && <span className="text-content/40">{l.columnTitle} · </span>}
                  {l.label} <span className="text-content/40">→ {l.href}</span>
                </span>
                <button
                  onClick={() => startTransition(() => deleteMenuLink(l.id))}
                  disabled={busy}
                  className="text-[11px] uppercase tracking-[0.1em] text-content/40 hover:text-content"
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}
        <form action={linkAction} className="flex flex-wrap items-end gap-2">
          <input name="columnTitle" placeholder="Coluna (ex: Coleções)" className={input} />
          <input name="label" placeholder="Rótulo do link" required className={input} />
          <input name="href" placeholder="Link (ex: /colecoes/essential)" required className={`${input} min-w-[200px]`} />
          <button disabled={linkPending} className="border border-content/40 px-4 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors hover:border-content disabled:opacity-50">
            {linkPending ? "..." : "+ link"}
          </button>
          {linkState.error && <span className="text-[12px] text-content/70">{linkState.error}</span>}
        </form>
      </div>
    </div>
  );
}
