import "server-only";

// Plain REST calls to Supabase's Admin (GoTrue) API instead of the full
// @supabase/supabase-js client — that client's constructor unconditionally
// initializes a Realtime WebSocket client, which throws on Node < 22
// ("native WebSocket not found"). This module only ever needs one endpoint,
// so a fetch call sidesteps that fragility entirely.
//
// Used ONLY by src/lib/admin/users.ts, and only inside Server Actions that
// have already called requireAdmin(). Never import this from anywhere else.

function adminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function adminCreateUser(params: {
  email: string;
  password: string;
  user_metadata?: Record<string, unknown>;
}): Promise<{ error?: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: params.user_metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.msg ?? body.message ?? `Erro ${res.status}` };
  }

  return {};
}

export type AdminUser = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export async function adminListUsers(): Promise<AdminUser[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=100`,
    { headers: adminHeaders(), cache: "no-store" }
  );
  if (!res.ok) return [];
  const body = await res.json().catch(() => ({ users: [] }));
  const users = (body.users ?? []) as Array<{
    id: string;
    email?: string;
    created_at?: string;
    last_sign_in_at?: string;
  }>;
  return users.map((u) => ({
    id: u.id,
    email: u.email ?? "—",
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
  }));
}
