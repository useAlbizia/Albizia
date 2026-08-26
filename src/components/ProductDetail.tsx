"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { ProductCover } from "./ProductImage";
import { SizeGuide } from "./SizeGuide";
import { track } from "@/lib/analytics-client";

export function ProductDetail({ product }: { product: Product }) {
  const inStock = product.variants.find((v) => v.stock > 0);
  const [size, setSize] = useState(inStock?.size ?? product.variants[0]?.size);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  useEffect(() => {
    track({ type: "product_view", productSlug: product.slug });
  }, [product.slug]);

  const selectedVariant = product.variants.find((v) => v.size === size);
  const canAdd = !!selectedVariant && selectedVariant.stock > 0;
  const maxQty = selectedVariant?.stock ?? 1;

  function handleAdd() {
    if (!selectedVariant || selectedVariant.stock <= 0) return;
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      size: selectedVariant.size,
      variantId: selectedVariant.id,
      quantity: Math.min(qty, selectedVariant.stock),
      image: product.images[0]?.url,
    });
    track({ type: "add_to_cart", productSlug: product.slug });
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
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Tamanho</p>
            <SizeGuide category={product.category} />
          </div>
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

        {canAdd && (
          <div className="mt-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Quantidade</p>
            <div className="inline-flex items-center border border-content/30">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="px-4 py-2.5 text-content/60 transition-colors hover:text-content disabled:opacity-30"
                disabled={qty <= 1}
              >
                −
              </button>
              <span className="min-w-[3ch] text-center text-sm">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Aumentar quantidade"
                className="px-4 py-2.5 text-content/60 transition-colors hover:text-content disabled:opacity-30"
                disabled={qty >= maxQty}
              >
                +
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="mt-8 w-full border border-content bg-content py-4 text-[13px] uppercase tracking-[0.2em] text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:border-content/20 disabled:bg-transparent disabled:text-content/30 sm:w-auto sm:px-12"
        >
          {canAdd ? "Adicionar ao carrinho" : "Esgotado"}
        </button>
      </div>
    </div>
  );
}
