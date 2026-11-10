import "server-only";
import webpush from "web-push";
import { inArray, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pushInscricoes } from "@/lib/db/schema";

// Notificação no celular (Web Push) para o aplicativo do painel.
//
// Precisa de três variáveis na Vercel: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY e VAPID_SUBJECT (mailto:). Sem elas tudo aqui vira
// "não faz nada", sem erro: o e-mail continua sendo o aviso garantido.
//
// No iPhone só funciona com o painel INSTALADO na tela de início (iOS 16.4
// ou mais novo); no Android e no computador funciona também no navegador.

export type AvisoPush = {
  titulo: string;
  corpo: string;
  /** Para onde o toque na notificação leva. */
  url: string;
  /** Notificações com a mesma tag se substituem em vez de empilhar. */
  tag?: string;
  /** Número no ícone do aplicativo, quando o aparelho mostra. */
  contador?: number;
};

let configurado: boolean | null = null;
function configurar(): boolean {
  if (configurado !== null) return configurado;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sujeito = process.env.VAPID_SUBJECT || "mailto:acesso@usealbizia.com.br";
  if (!pub || !priv) return (configurado = false);
  webpush.setVapidDetails(sujeito, pub, priv);
  return (configurado = true);
}

export function pushDisponivel(): boolean {
  return configurar();
}

export async function salvarInscricaoPush(
  email: string,
  inscricao: { endpoint: string; keys: { p256dh: string; auth: string } },
  aparelho: string,
): Promise<void> {
  await db
    .insert(pushInscricoes)
    .values({
      email: email.toLowerCase(),
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
      aparelho: aparelho.slice(0, 200),
    })
    // O mesmo aparelho pode trocar de dono (alguém sai e outro entra): o
    // endpoint é do aparelho, então fica com quem se inscreveu por último.
    .onConflictDoUpdate({
      target: pushInscricoes.endpoint,
      set: { email: email.toLowerCase(), p256dh: inscricao.keys.p256dh, auth: inscricao.keys.auth },
    });
}

export async function removerInscricaoPush(endpoint: string): Promise<void> {
  await db.delete(pushInscricoes).where(eq(pushInscricoes.endpoint, endpoint));
}

export async function aparelhosDe(email: string): Promise<number> {
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(pushInscricoes)
      .where(eq(pushInscricoes.email, email.toLowerCase()));
    return r?.n ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Manda o aviso para todos os aparelhos das pessoas indicadas. Nunca lança
 * erro: notificação é reforço, nunca pode atrapalhar o lançamento.
 * Aparelho que o serviço de push diz que não existe mais (app desinstalado,
 * permissão retirada) sai da lista.
 */
export async function enviarPush(emails: string[], aviso: AvisoPush): Promise<number> {
  if (!configurar() || emails.length === 0) return 0;
  try {
    const subs = await db
      .select()
      .from(pushInscricoes)
      .where(inArray(pushInscricoes.email, emails.map((e) => e.toLowerCase())));
    const payload = JSON.stringify(aviso);
    let entregues = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          entregues++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await removerInscricaoPush(s.endpoint).catch(() => {});
          else console.error("push falhou", status);
        }
      }),
    );
    return entregues;
  } catch (err) {
    console.error("enviarPush falhou", err);
    return 0;
  }
}
