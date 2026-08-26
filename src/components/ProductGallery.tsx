"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ProductPlaceholder } from "./ProductPlaceholder";
import type { ProductImage } from "@/lib/products";

// Product image gallery: a large main image with a thumbnail strip and a
// full-screen zoom (lightbox). Thumbnails sit below on mobile, beside on
// desktop — the pattern shoppers expect from large stores.
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  if (images.length === 0) {
    return <ProductPlaceholder name={name} className="aspect-[4/5] w-full" />;
  }

  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-visible">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagem ${i + 1}`}
              className={`relative h-20 w-16 shrink-0 overflow-hidden bg-surface-soft transition-opacity ${
                i === active ? "ring-1 ring-content" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label="Ampliar imagem"
        className="group relative order-1 aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden bg-surface-soft sm:order-2"
      >
        <Image
          src={main.url}
          alt={name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </button>

      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setZoomed(false)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/90 p-4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs natural sizing */}
            <img src={main.url} alt={name} className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              aria-label="Fechar"
              className="absolute right-5 top-5 text-2xl text-white/70 transition-colors hover:text-white"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
