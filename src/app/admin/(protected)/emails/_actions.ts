"use server";

import { revalidatePath } from "next/cache";
import { eq, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { emailMensagens } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { esc, sendEmailDetailed } from "@/lib/email";
import { linkDoAnexo } from "@/lib/email-inbound";

// Remetente das respostas: a caixa de contato, não o pedidos@ dos e-mails
// automáticos. Quem respondeu continua a conversa no mesmo endereço.
const CONTATO = process.env.EMAIL_CONTATO ?? "ALBIZIA <contato@usealbizia.com.br>";

function refresh() {
  revalidatePath("/admin/emails");
}

type Campo = "lido" | "importante" | "arquivado" | "spam";

export async function marcar(id: string, campo: Campo, valor: boolean): Promise<void> {
  await requireAdmin();
  await db.update(emailMensagens).set({ [campo]: valor }).where(eq(emailMensagens.id, id));
  refresh();
}

/** Lixeira: some das pastas, mas pode ser restaurado. */
export async function moverParaLixeira(id: string): Promise<void> {
  await requireAdmin();
  await db.update(emailMensagens).set({ excluidoEm: new Date() }).where(eq(emailMensagens.id, id));
  refresh();
}

export async function restaurar(id: string): Promise<void> {
  await requireAdmin();
  await db.update(emailMensagens).set({ excluidoEm: null }).where(eq(emailMensagens.id, id));
  refresh();
}

/** Esvazia a lixeira: apaga de vez só o que já estava lá. */
export async function esvaziarLixeira(): Promise<void> {
  const user = await requireAdmin();
  const apagados = await db
    .delete(emailMensagens)
    .where(isNotNull(emailMensagens.excluidoEm))
    .returning({ id: emailMensagens.id });
  await logAudit({ action: "email.lixeira_esvaziada", entity: "email", entityId: "", detail: { quantidade: apagados.length, por: user.email } });
  refresh();
}

export async function baixarAnexo(mensagemId: string, anexoId: string): Promise<string | null> {
  await requireAdmin();
  const m = await db.query.emailMensagens.findFirst({ where: eq(emailMensagens.id, mensagemId) });
  if (!m?.resendId || m.direcao !== "in") return null;
  return linkDoAnexo(m.resendId, anexoId);
}

export type EnvioState = { ok?: boolean; error?: string };

/**
 * Envia um e-mail escrito no painel: resposta (respondendoA preenchido) ou
 * novo. O texto vira HTML simples e escapado: o que alguém digitar aqui
 * nunca vira código dentro do e-mail.
 */
export async function enviarEmail(_prev: EnvioState, fd: FormData): Promise<EnvioState> {
  const user = await requireAdmin();

  const para = String(fd.get("para") ?? "").trim().toLowerCase();
  const assunto = String(fd.get("assunto") ?? "").trim();
  const texto = String(fd.get("texto") ?? "").trim();
  const respondendoA = String(fd.get("respondendoA") ?? "") || null;

  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(para)) return { error: "E-mail do destinatário inválido." };
  if (!assunto) return { error: "Escreva o assunto." };
  if (!texto) return { error: "Escreva a mensagem." };
  if (texto.length > 20000) return { error: "Mensagem longa demais." };

  // Resposta: o e-mail entra na mesma conversa no Gmail/Outlook de quem
  // escreveu, e o texto original vai citado embaixo.
  const headers: Record<string, string> = {};
  let citacao = "";
  let inReplyTo: string | null = null;
  if (respondendoA) {
    const original = await db.query.emailMensagens.findFirst({ where: eq(emailMensagens.id, respondendoA) });
    if (original?.messageId) {
      headers["In-Reply-To"] = original.messageId;
      headers["References"] = original.messageId;
      inReplyTo = original.messageId;
    }
    if (original?.texto) {
      const quando = original.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      citacao = `\n\nEm ${quando}, ${original.deNome ?? original.deEmail} escreveu:\n${original.texto
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}`;
    }
  }

  const corpo = texto + citacao;
  // Resposta com cara de conversa (sem a faixa preta dos e-mails de pedido),
  // mas assinada com o símbolo e o nome oficiais da marca, em imagem.
  const html = `<div style="font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#202124;white-space:pre-wrap">${esc(corpo)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;border-top:1px solid #e6e0d5;padding-top:16px"><tr>
<td style="padding:16px 12px 0 0;vertical-align:middle"><img src="https://www.usealbizia.com.br/logo/symbol-black.png" width="26" height="27" alt="" style="display:block;border:0;width:26px;height:27px"></td>
<td style="padding:16px 0 0;vertical-align:middle"><a href="https://www.usealbizia.com.br" style="text-decoration:none;color:#121212"><img src="https://www.usealbizia.com.br/logo/wordmark-black.png" width="110" height="13" alt="ALBIZIA" style="display:block;border:0;width:110px;height:13px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:5px;color:#121212"></a>
<p style="margin:6px 0 0;font-family:Montserrat,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;color:#8a857c">usealbizia.com.br</p></td>
</tr></table>`;

  const r = await sendEmailDetailed({ from: CONTATO, to: para, subject: assunto, html, text: corpo, replyTo: CONTATO, headers });
  if (!r.ok) return { error: r.reason };

  await db.insert(emailMensagens).values({
    direcao: "out",
    resendId: r.id ?? null,
    inReplyTo,
    deEmail: CONTATO.replace(/^.*<([^>]+)>.*$/, "$1"),
    deNome: "ALBIZIA",
    paraEmail: para,
    assunto,
    texto: corpo,
    lido: true,
    enviadoPor: user.email ?? null,
  });
  if (respondendoA) await db.update(emailMensagens).set({ lido: true }).where(eq(emailMensagens.id, respondendoA));

  await logAudit({ action: "email.enviado", entity: "email", entityId: para, detail: { assunto, resposta: !!respondendoA } });
  refresh();
  return { ok: true };
}
