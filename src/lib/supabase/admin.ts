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
