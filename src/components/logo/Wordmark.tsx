"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme";

type WordmarkProps = {
  className?: string;
  variant?: "black" | "white";
};

// Real brand artwork extracted from BD ALBIZIA.png — not a redraw.
const SRC = {
  black: "/logo/wordmark-black.png",
  white: "/logo/wordmark-white.png",
};

// Intrinsic size is 718x85 — pass a className with a height (h-*) and
// w-auto at each call site; aspect ratio is preserved automatically.
// Pass `variant` to pin a color; omit it to follow the current theme.
export function Wordmark({ className, variant }: WordmarkProps) {
  const theme = useTheme();
  const resolved = variant ?? (theme === "dark" ? "white" : "black");

  return (
    <Image
      src={SRC[resolved]}
      alt="ALBIZIA"
      width={718}
      height={85}
      priority
      className={className}
    />
  );
}
