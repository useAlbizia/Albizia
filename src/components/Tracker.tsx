"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics-client";

// Fires a page_view on every storefront route change. Admin routes are
// excluded — we don't want the founders' own browsing in the numbers.
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    track({ type: "page_view", path: pathname });
  }, [pathname]);

  return null;
}
