import { NextResponse, type NextRequest } from "next/server";
import { getLowStockVariants } from "@/lib/metrics";
import { getSiteSettings } from "@/lib/settings";
import { sendEmail, emailShell } from "@/lib/email";

export const dynamic = "force-dynamic";

// Daily Vercel Cron (see vercel.json). Emails the founders a digest of every
// size at/below the low-stock threshold so they can restock before selling out.
// Guarded by CRON_SECRET when set (Vercel sends it as a Bearer token) so the
// endpoint can't be hit to spam the inbox.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  const low = await getLowStockVariants(settings.lowStockThreshold);

  if (low.length === 0) {
    return NextResponse.json({ ok: true, low: 0 });
  }

  const notify = (process.env.ORDER_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (notify.length > 0) {
    const rows = low
      .map(
        (v) =>
          `<tr><td style="padding:6px 0;color:#55534e;">${v.productName} (${v.size})</td>
           <td style="padding:6px 0;text-align:right;font-weight:600;">${v.stock}</td></tr>`
      )
      .join("");

    await sendEmail({
      to: notify,
      subject: `Estoque baixo — ${low.length} tamanho(s) precisam de reposição`,
      html: emailShell(
        "Alerta de estoque baixo",
        `<p style="font-size:14px;line-height:1.6;color:#55534e;">Os tamanhos abaixo estão com ${settings.lowStockThreshold} unidade(s) ou menos:</p>
         <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
           <tr><td style="color:#8a857c;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Produto</td>
           <td style="text-align:right;color:#8a857c;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Estoque</td></tr>
           ${rows}
         </table>`
      ),
    });
  }

  return NextResponse.json({ ok: true, low: low.length });
}
