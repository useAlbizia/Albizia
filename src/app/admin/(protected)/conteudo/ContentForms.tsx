"use client";

import { useActionState } from "react";
import { saveSettings, saveLegalPage, type ContentState } from "./_actions";
import type { SiteSettings, LegalPage } from "@/lib/settings";

const initial: ContentState = {};
const input =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

function Status({ state }: { state: ContentState }) {
  if (state.error) return <p className="text-[13px] text-content/70">{state.error}</p>;
  if (state.ok) return <p className="text-[13px] text-content/50">Salvo ✓</p>;
  return null;
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action, pending] = useActionState(saveSettings, initial);
  return (
    <form action={action} className="flex max-w-lg flex-col gap-3">
      <label className="text-[11px] uppercase tracking-[0.2em] text-content/50">Empresa</label>
      <input name="companyName" defaultValue={settings.companyName} placeholder="Nome/Razão social" className={input} />
      <input name="cnpj" defaultValue={settings.cnpj} placeholder="CNPJ" className={input} />
      <input name="address" defaultValue={settings.address} placeholder="Endereço" className={input} />
      <label className="mt-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Contato</label>
      <input name="contactEmail" defaultValue={settings.contactEmail} placeholder="E-mail de contato" className={input} />
      <input name="contactPhone" defaultValue={settings.contactPhone} placeholder="Telefone" className={input} />
      <input name="instagram" defaultValue={settings.instagram} placeholder="Instagram (ex: @albizia)" className={input} />

      <label className="mt-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Frete</label>
      <input
        name="shippingFlat"
        type="number"
        step="0.01"
        min="0"
        defaultValue={(settings.shippingFlatCents / 100).toFixed(2)}
        placeholder="Frete fixo (R$) — 0 = grátis"
        className={input}
      />
      <input
        name="freeShippingThreshold"
        type="number"
        step="0.01"
        min="0"
        defaultValue={(settings.freeShippingThresholdCents / 100).toFixed(2)}
        placeholder="Frete grátis acima de (R$) — 0 = desativado"
        className={input}
      />

      <div className="mt-2 flex items-center gap-4">
        <button type="submit" disabled={pending} className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar dados"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function LegalForm({ page }: { page: LegalPage }) {
  const [state, action, pending] = useActionState(saveLegalPage, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={page.slug} />
      <input name="title" defaultValue={page.title} className={input} />
      <textarea name="body" defaultValue={page.body} rows={10} className={input} />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="border border-content px-6 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar página"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
