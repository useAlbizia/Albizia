import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "./admins";

// The current Supabase user, whoever they are (admin OR customer), or null.
// getUser() round-trips to Supabase to verify the JWT — unlike getSession(),
// which only decodes the cookie locally and is spoofable-adjacent. cache()
// dedupes repeated calls within one request.
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// The current user, but ONLY if their email is on the admin allowlist. Returns
// null for logged-out visitors AND for logged-in customers. This is the ONLY
// function that decides "is this person an admin" for anything touching admin
// data — customers and admins share one Supabase project, so a valid session
// is necessary but not sufficient.
export const getAdminUser = cache(async () => {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
});

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}
