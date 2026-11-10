import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { socios } from "@/lib/db/schema";
import { brl, isoDay } from "@/lib/format";
import { emailButton, emailShell, esc, sendEmail, SITE } from "@/lib/email";
import { contasAPagar, type ParteAPagar } from "@/lib/financeiro";
import { enviarPush } from "@/lib/push";

// Lembrete de parcela, pelo agendamento diário (10h de Brasília).
//
// Cada sócio recebe só o que é DELE: no dia em que a parte dele vence e,
// se continuar sem marcar, de novo a cada 7 dias de atraso. Um aviso por
// sócio por dia, juntando tudo o que vence ou está atrasado, para não virar
// uma enxurrada.

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export function deveLembrar(vencimento: string, hoje: string): boolean {
  const atraso = diasEntre(vencimento, hoje);
  return atraso === 0 || (atraso > 0 && atraso % 7 === 0);
}

export async function lembrarVencimentos(): Promise<number> {
  const hoje = isoDay(new Date());
  const todas = await contasAPagar();
  const doDia = todas.filter((c) => c.socioId && deveLembrar(c.vencimento, hoje));
  if (doDia.length === 0) return 0;

  const porSocio = new Map<string, ParteAPagar[]>();
  for (const c of doDia) porSocio.set(c.socioId!, [...(porSocio.get(c.socioId!) ?? []), c]);
  const pessoas = await db.select().from(socios).where(inArray(socios.id, [...porSocio.keys()]));

  let avisados = 0;
  for (const s of pessoas) {
    if (!s.email) continue;
    const contas = porSocio.get(s.id) ?? [];
    const total = contas.reduce((n, c) => n + c.valorCents, 0);
    const linha = (c: ParteAPagar) => {
      const atraso = diasEntre(c.vencimento, hoje);
      return `${c.descricao}${c.parcela ? ` ${c.parcela}` : ""}: ${brl(c.valorCents)}${atraso > 0 ? ` (atrasada ${atraso} dias)` : " (vence hoje)"}`;
    };
    const primeiro = s.nome.split(" ")[0];
    await enviarPush([s.email], {
      titulo: contas.length === 1 ? "Sua parte vence hoje" : `${contas.length} contas suas para pagar`,
      corpo: contas.length === 1 ? linha(contas[0]) : `Total ${brl(total)}. Toque para ver e marcar como pago.`,
      url: "/admin/lancamentos#contas",
      tag: "contas-a-pagar",
    });
    await sendEmail({
      from: "ALBIZIA <acesso@usealbizia.com.br>",
      to: s.email,
      subject: contas.length === 1 ? `Sua parte vence hoje: ${linha(contas[0])}` : `${contas.length} contas suas para pagar: ${brl(total)}`,
      html: emailShell(
        "Conta para pagar",
        `<p style="font-size:15px;line-height:1.7;color:#121212;margin:0 0 14px;">Olá, ${esc(primeiro)}. ${
          contas.length === 1 ? "Esta parte é sua:" : "Estas partes são suas:"
        }</p>
         <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.75;color:#121212;">${contas
           .map((c) => `<li>${esc(linha(c))}</li>`)
           .join("")}</ul>
         <p style="font-size:14px;line-height:1.7;color:#55534e;margin:0;">Depois de pagar, toque em <strong>Pagar</strong> no aplicativo e confirme a data. Só a parte marcada entra na sua conta de sócio.</p>
         ${emailButton("Abrir contas a pagar", `${SITE.replace(/\/$/, "")}/admin/lancamentos#contas`)}`,
      ),
    }).catch(() => false);
    avisados++;
  }
  return avisados;
}
