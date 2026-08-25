// Which emails may enter the admin panel. Everyone else with a Supabase
// session (e.g. a customer who signed up) is NOT an admin. This is what lets
// customers and admins share one Supabase Auth project safely.
//
// The two founders are hard-coded as a fallback so the panel can never be
// locked out — even if ADMIN_EMAILS is unset (e.g. on the Edge middleware,
// where non-public env vars may not be inlined). Set ADMIN_EMAILS in the
// environment (comma-separated) to add/replace admins without a deploy.
//
// No "server-only" here on purpose: this is imported by the Edge proxy too.
const FALLBACK_ADMINS = ["nilson.brites@gmail.com", "jairrodrigues04@gmail.com"];

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  const parsed = (raw ? raw.split(",") : [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  // Union with the founders so an env typo can't lock everyone out.
  return Array.from(new Set([...parsed, ...FALLBACK_ADMINS]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
