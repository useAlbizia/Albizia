"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createProduct, type ProductFormState } from "../_actions";
import type { CollectionInfo } from "@/lib/products";

const initialState: ProductFormState = {};
const inputClass =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

export function NewProductForm({ collections }: { collections: CollectionInfo[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  useEffect(() => {
    if (state.productId) router.push(`/admin/produtos/${state.productId}`);
  }, [state.productId, router]);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <input name="name" placeholder="Nome do produto" required className={inputClass} />
      <input
        name="slug"
        placeholder="slug-do-produto (ex: camiseta-nova-preta)"
        required
        pattern="[-a-z0-9]+"
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <select name="collectionSlug" required className={inputClass}>
          <option value="">Coleção</option>
          {collections.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="category" required className={inputClass}>
          <option value="">Categoria</option>
          <option value="camiseta">Camiseta</option>
          <option value="moda-praia">Moda Praia</option>
        </select>
      </div>

      <input
        name="price"
        type="number"
        step="0.01"
        min="0"
        placeholder="Preço (ex: 219.00)"
        required
        className={inputClass}
      />
      <input name="fabric" placeholder="Tecido" required className={inputClass} />
      <textarea
        name="description"
        placeholder="Descrição"
        required
        rows={3}
        className={inputClass}
      />
      <input
        name="sizesText"
        placeholder="Tamanhos separados por vírgula (opcional, padrão P,M,G,GG)"
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
        className="mt-2 border border-content py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar produto"}
      </button>
    </form>
  );
}
