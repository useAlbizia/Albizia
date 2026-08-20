"use client";

import { useState } from "react";
import { updateVariantStock } from "../_actions";

type Variant = { id: string; size: string; stock: number };

export function VariantsEditor({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const [values, setValues] = useState(
    Object.fromEntries(variants.map((v) => [v.id, v.stock]))
  );
  const [savedId, setSavedId] = useState<string | null>(null);

  async function save(variantId: string) {
    await updateVariantStock(variantId, values[variantId], productId);
    setSavedId(variantId);
    setTimeout(() => setSavedId((id) => (id === variantId ? null : id)), 1200);
  }

  return (
    <div className="flex flex-col gap-2">
      {variants.map((v) => (
        <div key={v.id} className="flex items-center gap-3">
          <span className="w-14 text-sm uppercase tracking-[0.1em] text-content/70">
            {v.size}
          </span>
          <input
            type="number"
            min={0}
            value={values[v.id]}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))
            }
            className="w-24 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
          />
          <button
            type="button"
            onClick={() => save(v.id)}
            className="border border-content/30 px-3 py-2 text-[11px] uppercase tracking-[0.1em] hover:border-content"
          >
            {savedId === v.id ? "Salvo" : "Salvar"}
          </button>
        </div>
      ))}
    </div>
  );
}
