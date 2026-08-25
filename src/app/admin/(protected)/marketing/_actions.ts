"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { subscribers, campaigns } from "@/lib/db/schema";
import { sendEmail, emailShell, emailButton } from "@/lib/email";

export type CampaignState = { ok?: boolean; error?: string; sent?: number };

const schema = z.object({
  subject: z.string().min(1, "Assunto obrigatório"),
  body: z.string().min(1, "Mensagem obrigatória"),
  ctaText: z.string().optional(),
  ctaUrl: z.string().optional(),
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Sends a campaign to every active subscriber. Each email carries an
// unsubscribe link. Uses Resend's batch endpoint in chunks of 100. Records
// the campaign as sent. (Until a domain is verified in Resend, delivery is
// limited to the account owner — the campaign is still recorded.)
export async function sendCampaign(
  _prev: CampaignState,
  formData: FormData
): Promise<CampaignState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    ctaText: formData.get("ctaText") || undefined,
    ctaUrl: formData.get("ctaUrl") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { subject, body, ctaText, ctaUrl } = parsed.data;

  // Optional call-to-action button (only if both text and a valid URL given).
  const ctaHtml =
    ctaText?.trim() && ctaUrl?.trim() && /^https?:\/\//.test(ctaUrl.trim())
      ? emailButton(ctaText.trim(), ctaUrl.trim())
      : "";

  const list = await db.query.subscribers.findMany({
    where: eq(subscribers.status, "active"),
  });
  if (list.length === 0) return { error: "Nenhum inscrito ativo ainda." };

  const paragraphs = body
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    .map(
      (p) =>
        `<p style="font-size:14px;line-height:1.7;color:#55534e;white-space:pre-line;">${p}</p>`
    )
    .join("");

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ALBIZIA <onboarding@resend.dev>";
  let sent = 0;

  if (key) {
    const batchUrl = "https://api.resend.com/emails/batch";
    for (let i = 0; i < list.length; i += 100) {
      const chunk = list.slice(i, i + 100);
      const payload = chunk.map((s) => {
        const unsub = `${SITE}/descadastrar?email=${encodeURIComponent(s.email)}`;
        const html = emailShell(
          subject,
          `${paragraphs}
           ${ctaHtml}
           <p style="font-size:11px;color:#8a857c;margin-top:24px;">
             Você recebe este e-mail por ter assinado a newsletter da ALBIZIA.
             <a href="${unsub}" style="color:#8a857c;">Cancelar inscrição</a>.
           </p>`
        );
        return { from, to: s.email, subject, html };
      });
      try {
        const res = await fetch(batchUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) sent += chunk.length;
        else console.error("campaign batch failed", res.status, await res.text().catch(() => ""));
      } catch (err) {
        console.error("campaign batch error", err);
      }
    }
  } else {
    // No key configured — still record intent, send nothing.
    void sendEmail;
  }

  await db.insert(campaigns).values({
    subject,
    body,
    status: "sent",
    recipientCount: list.length,
    sentAt: new Date(),
  });

  return { ok: true, sent };
}
