import "server-only";

// Thin wrapper over the Resend REST API (no SDK — a plain fetch avoids the
// Node-version quirks other SDKs have here). Never throws to the caller:
// email must never break an order or a request. Returns whether it sent.

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "ALBIZIA <onboarding@resend.dev>";
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping email:", subject);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!res.ok) {
      // Most common pre-domain-verification failure: Resend 403 for sending to
      // a non-owner address. Logged, but never surfaced to the customer.
      console.error("Resend send failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend request error", err);
    return false;
  }
}

const BRAND = "#121212";
const MUTED = "#55534e";
const FAINT = "#8a857c";
const CARD = "#f7f3ec";
const PAGE = "#e7e0d4";
const LINE = "#ddd5c7";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br";

// A CTA button, e.g. `${emailButton("Ver coleção", `${SITE}/produtos`)}`.
// Bulletproof-ish (padded anchor) so it renders across mail clients.
export function emailButton(label: string, url: string): string {
  return `<div style="text-align:center;margin:32px 0 8px;">
    <a href="${url}" style="display:inline-block;background:${BRAND};color:#f2ede5;text-decoration:none;padding:15px 40px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;">${label}</a>
  </div>`;
}

// On-brand HTML shell used by every transactional + marketing email: a hosted
// wordmark header, a titled content card, and a structured footer with store
// links. Inline styles only (mail clients ignore <style>). `bodyHtml` is the
// message; append an unsubscribe line to it for marketing sends.
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:${PAGE};font-family:Arial,Helvetica,sans-serif;color:${BRAND};">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <div style="text-align:center;padding:8px 0 24px;">
        <a href="${SITE}" style="text-decoration:none;">
          <img src="${SITE}/logo/wordmark-black.png" alt="ALBIZIA" height="26" style="height:26px;width:auto;border:0;" />
        </a>
      </div>
      <div style="background:${CARD};border:1px solid ${LINE};padding:40px 36px;">
        <h1 style="margin:0 0 20px;font-size:13px;letter-spacing:2.5px;text-transform:uppercase;color:${MUTED};font-weight:600;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:28px 12px 8px;text-align:center;">
        <p style="margin:0 0 12px;">
          <a href="${SITE}/produtos" style="color:${MUTED};text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Loja</a>
          <span style="color:${LINE};">&nbsp;·&nbsp;</span>
          <a href="${SITE}/acompanhar" style="color:${MUTED};text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Acompanhar pedido</a>
          <span style="color:${LINE};">&nbsp;·&nbsp;</span>
          <a href="https://instagram.com/albizia" style="color:${MUTED};text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Instagram</a>
        </p>
        <p style="margin:8px 0 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${FAINT};">Silence becomes style.</p>
        <p style="margin:6px 0 0;font-size:11px;color:${FAINT};">© ${new Date().getFullYear()} ALBIZIA</p>
      </div>
    </div>
  </body></html>`;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
