"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme";

type MonogramProps = {
  className?: string;
  variant?: "black" | "white";
};

// Real brand artwork extracted from BD ALBIZIA.png — not a redraw.
const SRC = {
  black: "/logo/monogram-black.png",
  white: "/logo/monogram-white.png",
};

// Intrinsic size is 200x67 — pass a className with a height (h-*) and
// w-auto at each call site; aspect ratio is preserved automatically.
// Pass `variant` to pin a color; omit it to follow the current theme.
export function Monogram({ className, variant }: MonogramProps) {
  const theme = useTheme();
  const resolved = variant ?? (theme === "dark" ? "white" : "black");

  return (
    <Image
      src={SRC[resolved]}
      alt="ABZ"
      width={200}
      height={67}
      className={className}
    />
  );
}
