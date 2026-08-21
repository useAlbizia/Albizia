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

// Minimal, on-brand HTML shell. Inline styles only (email clients ignore
// <style>). Neutral palette matching the site.
export function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f2ede5;font-family:Arial,Helvetica,sans-serif;color:${BRAND};">
    <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
      <div style="text-align:center;letter-spacing:6px;font-size:18px;font-weight:600;color:${BRAND};">ALBIZIA</div>
      <div style="height:1px;background:#d9d2c6;margin:28px 0;"></div>
      <h1 style="font-size:15px;letter-spacing:2px;text-transform:uppercase;color:${MUTED};font-weight:600;">${title}</h1>
      ${bodyHtml}
      <div style="height:1px;background:#d9d2c6;margin:32px 0 16px;"></div>
      <p style="font-size:11px;color:#8a857c;text-align:center;">Silence becomes style.</p>
    </div>
  </body></html>`;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
