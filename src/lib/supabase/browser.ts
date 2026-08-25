"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client — used by customer-facing components that need
// to start an OAuth flow (e.g. "Continuar com Google"). Reads the public
// anon key only; never the service role.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
