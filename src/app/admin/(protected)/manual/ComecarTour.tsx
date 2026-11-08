"use client";

import { useRouter } from "next/navigation";
import { iniciarTour } from "../TourPainel";

export function ComecarTour() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        iniciarTour();
        router.push("/admin");
      }}
      className="border border-content bg-content px-6 py-3 text-[12px] uppercase tracking-[0.2em] text-surface"
    >
      Começar o tour
    </button>
  );
}
