"use client";

import { useActionState, useState } from "react";
import { updateProduct, toggleProductActive, type ProductFormState } from "../_actions";
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

  async function handleToggleActive() {
    const next = !active;
    setActive(next);
    await toggleProductActive(product.id, next);
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-4">
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
          pattern="[a-z0-9-]+"
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
        <textarea
          name="description"
          defaultValue={product.description}
          required
          rows={3}
          className={inputClass}
        />

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
