"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { enviarPush, removerInscricaoPush, salvarInscricaoPush } from "@/lib/push";

const inscricaoSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function ativarNotificacoes(inscricao: unknown, aparelho: string): Promise<{ ok: boolean; erro?: string }> {
  const user = await requireAdmin();
  const s = inscricaoSchema.safeParse(inscricao);
  if (!s.success || !user.email) return { ok: false, erro: "Inscrição inválida." };
  // Só serviços de push dos navegadores de verdade: o servidor vai mandar
  // requisições para esse endereço, então ele não pode ser qualquer um.
  const host = new URL(s.data.endpoint).hostname;
  const permitido = [
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
    "notify.windows.com",
  ].some((h) => host === h || host.endsWith(`.${h}`));
  if (!permitido) return { ok: false, erro: "Serviço de notificação não reconhecido." };
  try {
    await salvarInscricaoPush(user.email, s.data, String(aparelho ?? ""));
  } catch {
    return { ok: false, erro: "Não foi possível salvar agora. A atualização do banco já foi aplicada?" };
  }
  return { ok: true };
}

export async function desativarNotificacoes(endpoint: string): Promise<void> {
  await requireAdmin();
  if (typeof endpoint === "string" && endpoint.length < 1000) await removerInscricaoPush(endpoint).catch(() => {});
}

export async function testarNotificacao(): Promise<{ ok: boolean; entregues: number }> {
  const user = await requireAdmin();
  const n = await enviarPush([user.email ?? ""], {
    titulo: "Notificações ligadas",
    corpo: "É assim que vão chegar os avisos de lançamento para aprovar.",
    url: "/admin/lancamentos",
    tag: "teste",
  });
  return { ok: n > 0, entregues: n };
}
