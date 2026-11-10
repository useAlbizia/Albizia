import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { emailMensagens } from "@/lib/db/schema";
import { assinaturaValida, buscarEmailRecebido } from "@/lib/email-inbound";

export const dynamic = "force-dynamic";

// Aviso do Resend: chegou e-mail em contato@usealbizia.com.br.
//
// Duas travas. Primeira: a assinatura do aviso é OBRIGATÓRIA; sem o segredo
// configurado na Vercel, nada entra (na barbearia ela era opcional). Segunda:
// o aviso traz só o ID, e o conteúdo é buscado no próprio Resend com a nossa
// chave, então nada que não chegou de verdade entra na caixa.
export async function POST(request: NextRequest) {
  const corpo = await request.text();

  const segredo = process.env.RESEND_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("[email recebido] RESEND_WEBHOOK_SECRET não configurado; aviso recusado");
    // 500 faz o Resend tentar de novo mais tarde: o e-mail não se perde,
    // entra assim que o segredo for configurado.
    return NextResponse.json({ error: "nao-configurado" }, { status: 500 });
  }
  const ok = await assinaturaValida(
    corpo,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    segredo,
  );
  if (!ok) return NextResponse.json({ error: "assinatura" }, { status: 401 });

  let evento: { type?: string; data?: { email_id?: string; id?: string } };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ error: "json" }, { status: 400 });
  }
  if (evento.type !== "email.received") return NextResponse.json({ ignorado: true });

  const emailId = evento.data?.email_id ?? evento.data?.id;
  if (!emailId) return NextResponse.json({ error: "sem-id" }, { status: 400 });

  const email = await buscarEmailRecebido(emailId);
  if (!email) return NextResponse.json({ error: "nao-encontrado" }, { status: 500 });

  try {
    await db
      .insert(emailMensagens)
      .values({
        direcao: "in",
        resendId: email.id,
        messageId: email.messageId,
        inReplyTo: email.inReplyTo,
        deEmail: email.deEmail,
        deNome: email.deNome,
        paraEmail: email.paraEmail,
        assunto: email.assunto,
        texto: email.texto,
        html: email.html,
        anexos: email.anexos,
        spam: email.spam,
        createdAt: email.criadoEm ? new Date(email.criadoEm) : new Date(),
      })
      // O mesmo aviso pode chegar mais de uma vez: grava uma só.
      .onConflictDoNothing({ target: emailMensagens.resendId });
  } catch (err) {
    console.error("[email recebido] falha ao gravar", err);
    return NextResponse.json({ error: "gravar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
