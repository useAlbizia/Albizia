"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { ProductCover } from "./ProductImage";
import { converge } from "@/lib/motion";

export function ProductDetail({ product }: { product: Product }) {
  const inStock = product.variants.find((v) => v.stock > 0);
  const [size, setSize] = useState(inStock?.size ?? product.variants[0]?.size);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  const selectedVariant = product.variants.find((v) => v.size === size);
  const canAdd = !!selectedVariant && selectedVariant.stock > 0;

  function handleAdd() {
    if (!selectedVariant || selectedVariant.stock <= 0) return;
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      size: selectedVariant.size,
      variantId: selectedVariant.id,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 px-6 py-20 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <ProductCover
          name={product.name}
          images={product.images}
          role="studio"
          className="col-span-2 aspect-[4/5] w-full"
        />
        <ProductCover
          name={`${product.name} — detalhe`}
          images={product.images}
          role="detail"
          tone="taupe"
          className="aspect-square w-full"
        />
        <ProductCover
          name={`${product.name} — lifestyle`}
          images={product.images}
          role="lifestyle"
          tone="graphite"
          className="aspect-square w-full"
        />
      </div>

      <div className="lg:pt-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-content/40">{product.fabric}</p>
        <h1 className="mt-3 text-2xl uppercase tracking-[0.1em]">{product.name}</h1>
        <p className="mt-3 text-lg text-content/70">
          {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-content/60">
          {product.description}
        </p>

        <div className="mt-10">
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Tamanho</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const outOfStock = v.stock <= 0;
              return (
                <button
                  key={v.size}
                  onClick={() => !outOfStock && setSize(v.size)}
                  disabled={outOfStock}
                  title={outOfStock ? "Esgotado" : undefined}
                  className={`border px-4 py-2 text-[13px] uppercase tracking-[0.1em] transition-colors ${
                    outOfStock
                      ? "cursor-not-allowed border-content/10 text-content/30 line-through"
                      : size === v.size
                        ? "border-content bg-content text-surface"
                        : "border-content/30 text-content/70 hover:border-content"
                  }`}
                >
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-10 w-full border border-content py-4 text-[13px] uppercase tracking-[0.2em] text-content transition-colors hover:bg-content hover:text-surface disabled:cursor-not-allowed disabled:border-content/20 disabled:text-content/30 disabled:hover:bg-transparent sm:w-auto sm:px-12"
        >
          {canAdd ? "Adicionar ao carrinho" : "Esgotado"}
        </button>

        {added && (
          <motion.p
            initial="hidden"
            animate="visible"
            variants={converge}
            className="mt-4 text-[12px] uppercase tracking-[0.15em] text-content/60"
          >
            Adicionado — {size}
          </motion.p>
        )}
      </div>
    </div>
  );
}
