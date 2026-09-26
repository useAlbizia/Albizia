import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/auth/dal";
import { buildAuthorizationUrl, getConnection } from "@/lib/mercadopago-oauth";
import { getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const OAUTH_STATE_COOKIE = "mp_oauth_state";

// Começa a conexão: leva quem está no painel para o Mercado Pago autorizar.
// Quem clica não vê chave nenhuma; só faz login na conta que vai receber.
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const conexao = await getConnection();
  if (!conexao.configurada) {
    return NextResponse.redirect(
      `${await getSiteOrigin()}/admin/pagamentos?erro=app_nao_configurada`,
    );
  }

  const origin = await getSiteOrigin();

  // `state` protege contra CSRF: o Mercado Pago devolve o mesmo valor, e a
  // volta só é aceita se bater com o cookie. Sem isso, alguém poderia
  // induzir a loja a conectar a conta errada.
  const state = randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // dez minutos: tempo de autorizar, não mais que isso
  });

  const url = buildAuthorizationUrl({
    clientId: conexao.clientId,
    redirectUri: `${origin}/api/mercadopago/oauth/callback`,
    state,
  });

  return NextResponse.redirect(url);
}
