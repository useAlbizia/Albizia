import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getAdminUser } from "@/lib/auth/dal";
import { exchangeCodeForTokens } from "@/lib/mercadopago-oauth";
import { getSiteOrigin } from "@/lib/site-url";
import { logAudit } from "@/lib/audit";
import { OAUTH_STATE_COOKIE } from "../start/route";

export const dynamic = "force-dynamic";

// Volta do Mercado Pago depois da autorização. Troca o código pelos tokens
// da conta que autorizou e guarda. A partir daqui a loja cobra na conta
// conectada, sem ninguém ter copiado chave.
export async function GET(request: NextRequest) {
  const origin = await getSiteOrigin();
  const destino = (msg: string) => NextResponse.redirect(`${origin}/admin/pagamentos?${msg}`);

  const user = await getAdminUser();
  if (!user) return NextResponse.redirect(`${origin}/admin/login`);

  const params = request.nextUrl.searchParams;
  const erroMp = params.get("error");
  if (erroMp) return destino("erro=autorizacao_negada");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return destino("erro=resposta_incompleta");

  // O state precisa bater com o cookie criado no início. Sem essa conferência
  // alguém poderia forjar a volta e conectar uma conta que não é a da loja.
  const jar = await cookies();
  const esperado = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);
  if (!esperado || esperado !== state) return destino("erro=state_invalido");

  const resultado = await exchangeCodeForTokens(
    code,
    `${origin}/api/mercadopago/oauth/callback`,
  );

  if (!resultado.ok) {
    console.error("Mercado Pago OAuth falhou", resultado.error);
    return destino(`erro=troca_falhou&detalhe=${encodeURIComponent(resultado.error)}`);
  }

  // Registra a conexão, nunca os tokens.
  await logAudit({
    action: "pagamentos.conectar_mp",
    entity: "site_settings",
    entityId: "1",
    detail: { mpUserId: resultado.userId, liveMode: resultado.liveMode },
  });

  return destino("conectado=1");
}
