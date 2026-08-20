import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// getUser() round-trips to Supabase to verify the JWT — unlike getSession(),
// which only decodes the cookie locally and is spoofable-adjacent. This is
// the ONLY function in the app that should decide "is this person an
// admin" for anything that touches data. cache() dedupes repeated calls
// within one request (page + every Server Action it renders may each call
// this — see src/proxy.ts's comment on why the page-level check alone
// isn't enough).
export const getAdminUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
