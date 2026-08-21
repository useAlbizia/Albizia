"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { CollectionInfo } from "@/lib/products";
import { Symbol } from "./logo/Symbol";
import { riseIn } from "@/lib/motion";

// An editorial band per collection. The model photo bleeds in and dissolves
// (masked gradient) toward the text, which sits on the faded half. Because
// the fade is a true alpha mask, the image melts into the theme background —
// cream by day, near-black by night.
//
// Desktop: photo on one side, text on the other, fading sideways; sides
// alternate down the page. Mobile: the same idea rotated 90° — a full-bleed
// photo that dissolves downward, with the name resting on the faded base.
export function CollectionRow({
  collection,
  index,
}: {
  collection: CollectionInfo;
  index: number;
}) {
  const imageLeft = index % 2 === 0;
  const fadeSide = imageLeft
    ? "linear-gradient(to right, black 45%, transparent 92%)"
    : "linear-gradient(to left, black 45%, transparent 92%)";
  const fadeDown = "linear-gradient(to bottom, black 52%, transparent 94%)";

  const cover = collection.coverUrl;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-12%" }}
      variants={riseIn}
    >
      {/* ── Mobile: full-bleed photo dissolving downward, name on the base ── */}
      <Link href={`/colecoes/${collection.slug}`} className="group block md:hidden">
        <div className="relative h-[62vh] w-full overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt={collection.name}
              fill
              sizes="100vw"
              className="object-cover object-top"
              style={{ maskImage: fadeDown, WebkitMaskImage: fadeDown }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Symbol className="h-20 w-20 opacity-20" />
            </div>
          )}
        </div>
        <div className="relative -mt-24 px-8 pb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-content/40">
            {collection.fabric}
          </p>
          <h3 className="mt-2 text-3xl uppercase tracking-[0.12em]">{collection.name}</h3>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-content/60">
            {collection.tagline}
          </p>
          <span className="mt-5 inline-block text-[12px] uppercase tracking-[0.22em] text-content/60 transition-colors group-hover:text-content">
            Explorar →
          </span>
        </div>
      </Link>

      {/* ── Desktop: side-by-side, photo dissolving toward the text ── */}
      <Link
        href={`/colecoes/${collection.slug}`}
        className="group relative hidden min-h-[70vh] grid-cols-2 items-center overflow-hidden md:grid"
      >
        <div className={`relative h-full w-full ${imageLeft ? "order-1" : "order-2"}`}>
          {cover ? (
            <Image
              src={cover}
              alt={collection.name}
              fill
              sizes="50vw"
              className="object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              style={{ maskImage: fadeSide, WebkitMaskImage: fadeSide }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Symbol className="h-24 w-24 opacity-20" />
            </div>
          )}
        </div>

        <div
          className={`relative z-10 px-14 py-10 ${
            imageLeft ? "order-2 text-left" : "order-1 text-right"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.25em] text-content/40">
            {collection.fabric}
          </p>
          <h3 className="mt-3 text-4xl uppercase tracking-[0.12em]">{collection.name}</h3>
          <p className="mt-3 text-sm uppercase tracking-[0.2em] text-content/60">
            {collection.tagline}
          </p>
          <p
            className={`mt-5 max-w-sm text-sm leading-relaxed text-content/55 ${
              imageLeft ? "" : "ml-auto"
            }`}
          >
            {collection.description}
          </p>
          <span className="mt-7 inline-block text-[12px] uppercase tracking-[0.22em] text-content/60 transition-colors group-hover:text-content">
            Explorar →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
