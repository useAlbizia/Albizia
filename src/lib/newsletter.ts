"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { subscribers } from "./db/schema";
import { sendEmail, emailShell, emailButton } from "./email";

export type SubscribeState = { ok?: boolean; error?: string };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br";

async function sendWelcome(email: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Bem-vindo(a) à ALBIZIA",
    html: emailShell(
      "Bem-vindo(a)",
      `<p style="font-size:14px;line-height:1.7;color:#55534e;">Que bom ter você por aqui. A ALBIZIA nasce de uma ideia simples: peças essenciais, de alto padrão, feitas para durar — sem ruído.</p>
       <p style="font-size:14px;line-height:1.7;color:#55534e;">Você será um dos primeiros a saber de novos lançamentos, edições limitadas e ofertas exclusivas.</p>
       ${emailButton("Conhecer a coleção", `${SITE}/produtos`)}`
    ),
  });
}

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const parsed = z.string().email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "E-mail inválido." };
  const email = parsed.data;

  // Only greet genuinely new or re-activated addresses — not someone who's
  // already an active subscriber re-submitting the form.
  const existing = await db.query.subscribers.findFirst({
    where: eq(subscribers.email, email),
  });
  const shouldWelcome = !existing || existing.status !== "active";

  // Insert, or re-activate a previously unsubscribed address.
  await db
    .insert(subscribers)
    .values({ email, source: "site" })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: { status: "active", unsubscribedAt: sql`null` },
    });

  if (shouldWelcome) {
    // Best-effort: a welcome email must never fail the subscription.
    await sendWelcome(email).catch(() => {});
  }

  return { ok: true };
}

export type UnsubscribeState = { done?: boolean; error?: string };

export async function unsubscribe(
  _prev: UnsubscribeState,
  formData: FormData
): Promise<UnsubscribeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "E-mail ausente." };

  await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.email, email));

  return { done: true };
}
