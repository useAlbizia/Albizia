"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Symbol } from "./logo/Symbol";
import { EASE } from "@/lib/motion";

// "Traço-a-traço": a pen draws the ALBIZIA tree so its birth is actually
// watchable — the trunk sprouts up from the root first, then each branch
// pair unfurls outward, then the crown flag, and finally the solid real
// symbol resolves in. Geometry traced from the real artwork (per-scanline
// pixel analysis of symbol-black.png, viewBox 874x897). stroke=currentColor
// keeps it transparent and theme-coloured (black by day, cream by night).
//
// Deliberately slow (~4s total): the point is that you SEE it grow.

// [d, drawStart(s), drawDuration(s)] — ordered as the tree grows.
const STROKES: [string, number, number][] = [
  ["M444 887 L451 40", 0.0, 1.3], // trunk sprouts up from the root — the slow lead
  ["M366 652 L52 430", 1.15, 0.85], // lower-left branch
  ["M522 652 L822 430", 1.15, 0.85], // lower-right branch
  ["M402 470 L84 223", 1.75, 0.85], // upper-left branch
  ["M486 470 L804 223", 1.75, 0.85], // upper-right branch
  ["M470 208 L560 156", 2.45, 0.5], // upper-right shoot
  ["M346 158 L452 56", 2.7, 0.55], // crown flag
];

const SKETCH_DONE = 3.25; // when the last stroke finishes
const RESOLVE_AT = 3.1; // solid symbol begins fading in just before

export function AnimatedSymbolDraw({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  // Respect reduced-motion: no drawing, just the final mark.
  if (reduce) {
    return (
      <div className={`inline-block ${className ?? ""}`}>
        <Symbol className="h-full w-auto" />
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <motion.svg
        viewBox="0 0 874 897"
        className="block h-full w-auto"
        fill="none"
        stroke="currentColor"
        strokeWidth={15}
        strokeLinecap="round"
        strokeLinejoin="round"
        // fade the sketch away once the solid symbol has resolved in
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, delay: SKETCH_DONE + 0.35, ease: "easeInOut" }}
      >
        {STROKES.map(([d, start, dur], i) => (
          <motion.path
            key={i}
            d={d}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: dur, delay: start, ease: EASE },
              opacity: { duration: 0.01, delay: start },
            }}
          />
        ))}
      </motion.svg>

      {/* the solid, exact symbol resolves in as the sketch completes */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.0, delay: RESOLVE_AT, ease: EASE }}
      >
        <Symbol className="h-full w-auto" />
      </motion.div>
    </div>
  );
}
