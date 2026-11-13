import { NextResponse, type NextRequest } from "next/server";
import { registrarErro, resumoDiarioErros } from "@/lib/erros";
import { emailsDaEquipe } from "@/lib/destinatarios";
import { getLowStockVariants } from "@/lib/metrics";
import { getSiteSettings } from "@/lib/settings";
import { sendEmail, emailShell } from "@/lib/email";
import { enviarMotivacao } from "@/lib/motivacao";
import { lembrarVencimentos } from "@/lib/lembretes";

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

  // Carona no agendamento diário, cada uma isolada para nunca impedir o
  // aviso de estoque: o lembrete de quem tem parte de parcela vencendo hoje
  // ou atrasada, e a mensagem de motivação (no máximo uma por dia).
  const falhaTarefa = (nome: string) => (err: unknown) =>
    registrarErro({
      origem: "servidor",
      area: "sistema",
      gravidade: "alta",
      caminho: `tarefa diária: ${nome}`,
      mensagem: `A tarefa automática "${nome}" falhou: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500),
    }).catch(() => {});
  await lembrarVencimentos().catch(falhaTarefa("lembretes de contas"));
  // Resumo diário dos erros médios para os administradores.
  await resumoDiarioErros().catch(falhaTarefa("resumo de erros"));

  let motivacao: unknown = null;
  try {
    motivacao = await enviarMotivacao();
  } catch (err) {
    console.error("motivacao falhou", err);
    await falhaTarefa("motivação")(err);
  }

  const settings = await getSiteSettings();
  const low = await getLowStockVariants(settings.lowStockThreshold);

  if (low.length === 0) {
    return NextResponse.json({ ok: true, low: 0, motivacao });
  }

  const notify = await emailsDaEquipe();

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
      subject: `Estoque baixo: ${low.length} tamanho(s) precisam de reposição`,
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
