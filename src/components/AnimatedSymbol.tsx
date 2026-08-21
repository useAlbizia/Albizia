"use client";

import { Symbol } from "./logo/Symbol";

// The brand mark growing into being. It reveals bottom-up via the pure-CSS
// `albizia-grow` keyframe (see globals.css) — no framer-motion, so it can't
// be swallowed by a parent's variant propagation. Because it renders the
// real transparent symbol art (black by day, white by night, swapped inside
// <Symbol/> by theme), there is no baked-in background and the colour
// follows the time-of-day theme automatically. This replaces the old .mp4
// banner, which could never be truly transparent or recolour.
export function AnimatedSymbol({ className }: { className?: string }) {
  return (
    <div className="albizia-grow inline-block">
      <Symbol className={className} />
    </div>
  );
}
