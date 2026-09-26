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

// Define uma senha nova para um admin existente. Usado quando alguém perde o
// acesso e o e-mail de recuperação não resolve (caixa cheia, spam, domínio
// bloqueando). must_change_password força a troca no primeiro login, então a
// senha temporária serve uma vez só.
export async function adminSetPassword(params: {
  userId: string;
  password: string;
}): Promise<{ error?: string }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${params.userId}`,
    {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({
        password: params.password,
        user_metadata: { must_change_password: true },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.msg ?? body.message ?? `Erro ${res.status}` };
  }

  return {};
}

// Gera o link de recuperação SEM disparar e-mail do Supabase.
//
// POR QUE: o e-mail padrão do Supabase chega como "Supabase Auth
// <noreply@mail.app.supabase.io>", em inglês, com rodapé "powered by
// Supabase". Quem recebe não reconhece a loja e trata como golpe. Gerando o
// link aqui, a ALBIZIA envia pelo próprio template, em português e com a
// marca, pelo mesmo Resend que já manda a confirmação de pedido.
export async function adminGenerateRecoveryLink(params: {
  email: string;
  redirectTo: string;
}): Promise<{ link?: string; error?: string }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: adminHeaders(),
    // `redirect_to` vai na RAIZ do corpo. Dentro de `options` (que é a
    // convenção do cliente JS) a API REST ignora em silêncio e devolve o
    // Site URL, mandando quem clica para a home em vez da tela de senha.
    // Verificado na API real: só a forma raiz preserva o destino.
    body: JSON.stringify({
      type: "recovery",
      email: params.email,
      redirect_to: params.redirectTo,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: body.msg ?? body.message ?? `Erro ${res.status}` };
  }

  // A chave mudou de lugar entre versões do GoTrue; aceita as duas.
  const link = body.action_link ?? body.properties?.action_link;
  if (!link) return { error: "O Supabase não devolveu o link." };
  return { link };
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
