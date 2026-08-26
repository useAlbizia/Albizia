"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  updateProduct,
  toggleProductActive,
  aiGenerateDescription,
  type ProductFormState,
} from "../_actions";
import type { CollectionInfo } from "@/lib/products";

const initialState: ProductFormState = {};
const inputClass =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  priceCents: number;
  fabric: string;
  description: string;
  active: boolean;
  colorGroup: string | null;
  colorName: string;
  colorHex: string;
  collection: { slug: string };
};

export function EditProductForm({
  product,
  collections,
}: {
  product: Product;
  collections: CollectionInfo[];
}) {
  const boundUpdate = updateProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);
  const [active, setActive] = useState(product.active);

  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState(product.description);
  const [aiPending, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleToggleActive() {
    const next = !active;
    setActive(next);
    await toggleProductActive(product.id, next);
  }

  function handleGenerate() {
    const fd = new FormData(formRef.current!);
    setAiError(null);
    startAi(async () => {
      const r = await aiGenerateDescription({
        name: String(fd.get("name") ?? ""),
        category: String(fd.get("category") ?? ""),
        collectionSlug: String(fd.get("collectionSlug") ?? ""),
        fabric: String(fd.get("fabric") ?? ""),
      });
      if ("text" in r) setDescription(r.text);
      else setAiError(r.error);
    });
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        <input
          name="name"
          defaultValue={product.name}
          placeholder="Nome do produto"
          required
          className={inputClass}
        />
        <input
          name="slug"
          defaultValue={product.slug}
          placeholder="slug-do-produto"
          required
          pattern="[-a-z0-9]+"
          className={inputClass}
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            name="collectionSlug"
            defaultValue={product.collection.slug}
            required
            className={inputClass}
          >
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={product.category} required className={inputClass}>
            <option value="camiseta">Camiseta</option>
            <option value="moda-praia">Moda Praia</option>
          </select>
        </div>

        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={(product.priceCents / 100).toFixed(2)}
          required
          className={inputClass}
        />
        <input
          name="fabric"
          defaultValue={product.fabric}
          placeholder="Tecido"
          required
          className={inputClass}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.2em] text-content/50">Descrição</span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={aiPending}
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-content/60 transition-colors hover:text-content disabled:opacity-50"
            >
              <span aria-hidden="true">✦</span>
              {aiPending ? "Gerando..." : "Gerar com IA"}
            </button>
          </div>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className={inputClass}
          />
          {aiError && <p className="text-[12px] text-content/70">{aiError}</p>}
        </div>

        <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-content/50">Cor</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            name="colorGroup"
            defaultValue={product.colorGroup ?? ""}
            placeholder="Grupo (ex: essential-tee)"
            className={inputClass}
            title="Produtos com o mesmo grupo aparecem como opções de cor"
          />
          <input name="colorName" defaultValue={product.colorName} placeholder="Nome (ex: Preto)" className={inputClass} />
          <input
            name="colorHex"
            type="color"
            defaultValue={product.colorHex || "#141414"}
            className="h-[46px] w-full border border-content/30 bg-transparent px-1"
            title="Cor da amostra"
          />
        </div>

        {state.error && (
          <p className="text-[13px] text-content/70" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleToggleActive}
        className="border border-content/30 py-3 text-[12px] uppercase tracking-[0.15em] text-content/70 hover:border-content hover:text-content"
      >
        {active ? "Desativar produto (some do site)" : "Reativar produto"}
      </button>
    </div>
  );
}
