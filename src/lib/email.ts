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
const FAINT = "#9a948a";
const PAGE = "#ece6da";
const LINE = "#eee9e0";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br";

// A CTA button, e.g. `${emailButton("Ver coleção", `${SITE}/produtos`)}`.
// Bulletproof-ish (padded anchor) so it renders across mail clients.
export function emailButton(label: string, url: string): string {
  return `<div style="text-align:center;margin:34px 0 6px;">
    <a href="${url}" style="display:inline-block;background:${BRAND};color:#f2ede5;text-decoration:none;padding:16px 44px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;">${label}</a>
  </div>`;
}

// On-brand HTML shell for every transactional + marketing email. The wordmark
// is rendered as TEXT on a black band — not an image — so it never breaks when
// a mail client blocks images (most do by default) and always looks sharp.
// A white content card gives real contrast against the cream page. Inline
// styles only (mail clients ignore <style>). Append an unsubscribe line to
// `bodyHtml` for marketing sends.
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:${PAGE};font-family:Arial,Helvetica,sans-serif;color:${BRAND};">
    <div style="max-width:600px;margin:0 auto;padding:28px 14px;">
      <div style="background:${BRAND};padding:30px 24px;text-align:center;">
        <a href="${SITE}" style="text-decoration:none;color:#f4efe6;font-size:22px;line-height:1;letter-spacing:9px;font-weight:700;">ALBIZIA</a>
      </div>
      <div style="background:#ffffff;border:1px solid ${LINE};border-top:0;padding:44px 40px;">
        <h1 style="margin:0 0 22px;font-size:12px;letter-spacing:2.5px;text-transform:uppercase;color:${FAINT};font-weight:700;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:26px 12px 8px;text-align:center;">
        <p style="margin:0 0 14px;">
          <a href="${SITE}/produtos" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Loja</a>
          <span style="color:#c9c1b2;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <a href="${SITE}/acompanhar" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Acompanhar pedido</a>
          <span style="color:#c9c1b2;">&nbsp;&nbsp;·&nbsp;&nbsp;</span>
          <a href="https://instagram.com/albizia" style="color:${MUTED};text-decoration:none;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Instagram</a>
        </p>
        <p style="margin:10px 0 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${FAINT};">Silence becomes style.</p>
        <p style="margin:6px 0 0;font-size:11px;color:${FAINT};">© ${new Date().getFullYear()} ALBIZIA</p>
      </div>
    </div>
  </body></html>`;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
