"use client";

import Image from "next/image";
import { useTheme } from "@/lib/theme";

type SymbolProps = {
  className?: string;
  variant?: "black" | "white";
};

// Real brand artwork extracted from the user-supplied symbol file — not a redraw.
const SRC = {
  black: "/logo/symbol-black.png",
  white: "/logo/symbol-white.png",
};

// Intrinsic size is 874x897 — pass a className with a height/width
// (h-* w-*) at each call site; aspect ratio is preserved automatically.
// Pass `variant` to pin a color; omit it to follow the current theme.
export function Symbol({ className, variant }: SymbolProps) {
  const theme = useTheme();
  const resolved = variant ?? (theme === "dark" ? "white" : "black");

  return (
    <Image
      src={SRC[resolved]}
      alt="ALBIZIA"
      width={874}
      height={897}
      priority
      className={className}
    />
  );
}
