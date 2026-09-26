import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { siteSettings } from "./db/schema";
import { sendEmail, emailShell } from "./email";
import { adminEmails } from "./auth/admins";
import { dateTime } from "./format";

// ── Conexão da conta do Mercado Pago por OAuth ───────────────────────────
//
// Duas contas diferentes participam, e confundir as duas é o que torna isso
// difícil de entender:
//
//  - A APLICAÇÃO vive na conta de quem desenvolve. Ela tem client_id e
//    client_secret, configurados uma vez e nunca mais.
//  - A CONTA CONECTADA é quem recebe o dinheiro. Ela autoriza clicando num
//    botão, e nós guardamos os tokens dela. Pode ser a conta CNPJ da empresa,
//    sem ninguém precisar copiar chave nenhuma.
//
// O access_token vence. O refresh_token serve para trocar por um novo sem
// incomodar ninguém, e é isso que getValidAccessToken faz sozinho.

const AUTORIZAR = "https://auth.mercadopago.com/authorization";
const TOKEN = "https://api.mercadopago.com/oauth/token";

// Renova com folga: esperar vencer significaria uma venda falhando primeiro.
const FOLGA_MS = 7 * 24 * 60 * 60 * 1000;

export type MpConnection = {
  configurada: boolean; // a aplicação tem client_id e secret
  clientId: string; // número da aplicação, não é segredo
  conectada: boolean; // alguma conta autorizou
  userId: string;
  publicKey: string;
  conectadaEm: Date | null;
  expiraEm: Date | null;
};

async function row() {
  return db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
}

// Credenciais da APLICAÇÃO: configuração de quem desenvolve, não de quem
// opera a loja. Ficam em variável de ambiente, fora do painel, para que a
// tela de pagamentos mostre só o botão de conectar. O banco existe como
// alternativa para quem não tem acesso ao deploy.
async function appCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const r = await row();
  return {
    clientId: process.env.MP_CLIENT_ID || r?.mpClientId || "",
    clientSecret: process.env.MP_CLIENT_SECRET || r?.mpClientSecret || "",
  };
}

export async function getConnection(): Promise<MpConnection> {
  const [r, app] = await Promise.all([row(), appCredentials()]);
  return {
    configurada: !!(app.clientId && app.clientSecret),
    clientId: app.clientId,
    conectada: !!r?.mpRefreshToken,
    userId: r?.mpUserId ?? "",
    publicKey: r?.mpPublicKey ?? "",
    conectadaEm: r?.mpConnectedAt ?? null,
    expiraEm: r?.mpExpiresAt ?? null,
  };
}

export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const u = new URL(AUTORIZAR);
  u.searchParams.set("client_id", params.clientId);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("platform_id", "mp");
  u.searchParams.set("state", params.state);
  u.searchParams.set("redirect_uri", params.redirectUri);
  return u.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user_id?: number | string;
  public_key?: string;
  live_mode?: boolean;
  message?: string;
  error?: string;
};

async function pedirToken(body: Record<string, string>): Promise<TokenResponse & { ok: boolean }> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  return { ...data, ok: res.ok };
}

// Troca o código da autorização pelos tokens e guarda tudo.
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ ok: true; userId: string; liveMode: boolean } | { ok: false; error: string }> {
  const app = await appCredentials();
  if (!app.clientId || !app.clientSecret) {
    return { ok: false, error: "A aplicação não está configurada." };
  }

  const data = await pedirToken({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  if (!data.ok || !data.access_token || !data.refresh_token) {
    return { ok: false, error: data.message ?? data.error ?? "O Mercado Pago recusou a conexão." };
  }

  const expiraEm = new Date(Date.now() + (data.expires_in ?? 0) * 1000);
  // Lido ANTES de sobrescrever, para o aviso conseguir dizer de qual conta
  // para qual conta a mudança aconteceu.
  const anterior = (await row())?.mpUserId ?? "";

  await db
    .update(siteSettings)
    .set({
      mpAccessToken: data.access_token,
      mpRefreshToken: data.refresh_token,
      mpPublicKey: data.public_key ?? "",
      mpUserId: String(data.user_id ?? ""),
      mpConnectedAt: new Date(),
      mpExpiresAt: expiraEm,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, 1));

  // Avisa os sócios sempre que a conta que RECEBE muda.
  //
  // Um invasor com senha de admin poderia trocar a conta e desviar as vendas
  // seguintes. Impedir a troca não dá (quem opera precisa poder trocar), mas
  // ninguém consegue fazer isso em silêncio: o aviso sai na hora, para todos
  // os administradores, com a conta antiga e a nova.
  if (anterior !== String(data.user_id ?? "")) {
    await avisarTrocaDeConta(anterior, String(data.user_id ?? "")).catch((e) =>
      console.error("Falha ao avisar troca de conta do Mercado Pago", e),
    );
  }

  return { ok: true, userId: String(data.user_id ?? ""), liveMode: data.live_mode !== false };
}

async function avisarTrocaDeConta(anterior: string, nova: string): Promise<void> {
  const destinos = adminEmails();
  if (destinos.length === 0) return;

  const quando = dateTime(new Date());
  await sendEmail({
    to: destinos,
    subject: "A conta que recebe os pagamentos foi alterada · ALBIZIA",
    html: emailShell(
      "Conta de recebimento alterada",
      `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 14px;">
         Em ${quando}, a conta do Mercado Pago que recebe as vendas da loja passou a ser
         <strong>nº ${nova}</strong>${anterior ? `, no lugar da nº ${anterior}` : ""}.
       </p>
       <p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 14px;">
         Se foi você ou seu sócio, ignore esta mensagem.
       </p>
       <p style="font-size:13px;line-height:1.7;color:#8a857c;margin:0;">
         Se NÃO foi, entre agora no painel, desconecte essa conta e troque a senha de todos os
         administradores. A partir do momento da troca, as vendas caem na conta indicada acima.
       </p>`,
    ),
  });
}

// Renova o access_token usando o refresh_token. Chamado sozinho quando a
// validade está perto do fim.
async function refresh(): Promise<boolean> {
  const [r, app] = await Promise.all([row(), appCredentials()]);
  if (!app.clientId || !app.clientSecret || !r?.mpRefreshToken) return false;

  const data = await pedirToken({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: "refresh_token",
    refresh_token: r.mpRefreshToken,
  });

  if (!data.ok || !data.access_token) {
    console.error("Mercado Pago: falha ao renovar o token", data.message ?? data.error);
    return false;
  }

  await db
    .update(siteSettings)
    .set({
      mpAccessToken: data.access_token,
      // O MP pode devolver um refresh novo; quando não devolve, o antigo vale.
      mpRefreshToken: data.refresh_token || r.mpRefreshToken,
      mpExpiresAt: new Date(Date.now() + (data.expires_in ?? 0) * 1000),
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, 1));

  return true;
}

// Token pronto para cobrar. Renova antes de vencer, para a renovação nunca
// cair no meio de uma compra.
export async function getValidAccessToken(): Promise<string> {
  const r = await row();
  if (!r) return "";

  const conectado = !!r.mpRefreshToken;
  const vencendo = r.mpExpiresAt ? r.mpExpiresAt.getTime() - Date.now() < FOLGA_MS : false;

  if (conectado && vencendo) {
    await refresh();
    const novo = await row();
    return novo?.mpAccessToken ?? "";
  }

  return r.mpAccessToken ?? "";
}

export async function disconnect(): Promise<void> {
  await db
    .update(siteSettings)
    .set({
      mpAccessToken: "",
      mpRefreshToken: "",
      mpPublicKey: "",
      mpUserId: "",
      mpConnectedAt: null,
      mpExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, 1));
}
