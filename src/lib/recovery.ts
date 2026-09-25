import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./db/client";
import { orders, siteSettings } from "./db/schema";
import { sendEmail, emailShell, money } from "./email";

// ── Recuperação de venda ──────────────────────────────────────────────────
// Um checkout que ficou pendente é dinheiro que já estava na mesa. A ideia,
// trazida pelo Jair da experiência dele numa gráfica, é não deixar isso
// parado: separar por urgência e por valor, e ligar para o cliente quando
// vale a pena.
//
// Nada aqui é IA. É contagem de tempo e comparação de número, justamente
// porque precisa funcionar às 3 da manhã sem errar.

export type RecoverySettings = {
  minutes: number;
  highValueCents: number;
  alertEmail: string;
};

export async function getRecoverySettings(): Promise<RecoverySettings> {
  const row = await db.query.siteSettings.findFirst({ where: eq(siteSettings.id, 1) });
  return {
    minutes: row?.recoveryMinutes ?? 60,
    highValueCents: row?.recoveryHighValueCents ?? 50000,
    alertEmail: row?.recoveryAlertEmail ?? "",
  };
}

// "agora" = a janela de pagamento está fechando ou acabou de falhar.
// "hoje"  = ainda há prazo, mas não pode ser esquecido.
// "normal"= sem pressa, um e-mail resolve.
export type Urgency = "agora" | "hoje" | "normal";

export type RecoveryOrder = {
  id: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  whatsappUrl: string | null;
  totalCents: number;
  createdAt: Date;
  minutesOld: number;
  paymentMethod: string | null;
  mpStatus: string | null;
  recoveryEmailSentAt: Date | null;
  items: string;
  isHighValue: boolean;
  urgency: Urgency;
  // Frase pronta explicando o que aconteceu, para quem for ligar já saber
  // o contexto sem precisar abrir o pedido.
  situation: string;
};

// wa.me exige só dígitos com DDI. Assume Brasil quando o número vem sem o 55.
function whatsapp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

// Traduz o estado do pagamento em urgência e numa explicação em português.
function classify(
  method: string | null,
  mpStatus: string | null,
  isHighValue: boolean,
): { urgency: Urgency; situation: string } {
  // Recusado é o melhor momento para ligar: a pessoa quis comprar e não
  // conseguiu. Costuma ser limite ou antifraude do banco, não desistência.
  if (mpStatus === "rejected") {
    return {
      urgency: "agora",
      situation: "O pagamento foi recusado pelo banco. O cliente tentou comprar e não conseguiu.",
    };
  }

  if (method === "pix") {
    return {
      urgency: "agora",
      situation: "Pix gerado e não pago. O código expira em minutos, depois disso a venda esfria.",
    };
  }

  if (method && /bol|ticket/i.test(method)) {
    return {
      urgency: "hoje",
      situation: "Boleto gerado e ainda não compensado. Há prazo, mas vale um lembrete.",
    };
  }

  if (!method) {
    return {
      urgency: isHighValue ? "agora" : "normal",
      situation: "O cliente preencheu os dados mas não chegou a escolher a forma de pagamento.",
    };
  }

  return {
    urgency: isHighValue ? "agora" : "normal",
    situation: "Pagamento iniciado e não concluído.",
  };
}

// Fila de recuperação, já priorizada: urgência primeiro, valor depois. Quem
// abrir a tela vê no topo exatamente quem ligar primeiro.
export async function listRecoveryQueue(): Promise<{
  queue: RecoveryOrder[];
  settings: RecoverySettings;
}> {
  const settings = await getRecoverySettings();

  const pending = await db.query.orders.findMany({
    where: eq(orders.status, "pending"),
    orderBy: [desc(orders.createdAt)],
    with: { items: true },
    limit: 200,
  });

  const cutoffMs = settings.minutes * 60000;
  const now = Date.now();

  const queue = pending
    .filter((o) => now - new Date(o.createdAt).getTime() >= cutoffMs)
    .map((o): RecoveryOrder => {
      const isHighValue = o.totalCents >= settings.highValueCents;
      const { urgency, situation } = classify(o.paymentMethod, o.mpStatus, isHighValue);
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        whatsappUrl: whatsapp(o.customerPhone),
        totalCents: o.totalCents,
        createdAt: o.createdAt,
        minutesOld: Math.floor((now - new Date(o.createdAt).getTime()) / 60000),
        paymentMethod: o.paymentMethod,
        mpStatus: o.mpStatus,
        recoveryEmailSentAt: o.recoveryEmailSentAt,
        items: o.items.map((i) => `${i.productName} (${i.size})×${i.quantity}`).join(" · "),
        isHighValue,
        urgency,
        situation,
      };
    });

  const rank: Record<Urgency, number> = { agora: 0, hoje: 1, normal: 2 };
  queue.sort((a, b) => {
    if (rank[a.urgency] !== rank[b.urgency]) return rank[a.urgency] - rank[b.urgency];
    return b.totalCents - a.totalCents;
  });

  return { queue, settings };
}

// Avisa a equipe quando pedido de alto valor empaca, que era o ponto central
// do que o Jair descreveu: ninguem precisa lembrar de abrir a tela, o aviso
// chega. Cada pedido so gera alerta uma vez (recoveryAlertSentAt), por mais
// que o cron rode de hora em hora.
export async function sendHighValueAlerts(): Promise<{
  alerted: number;
  skipped: string | null;
}> {
  const { queue, settings } = await listRecoveryQueue();

  const destinatarios = (settings.alertEmail || process.env.ORDER_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (destinatarios.length === 0) {
    return { alerted: 0, skipped: "nenhum e-mail de alerta configurado" };
  }

  // Só o que é alto valor E ainda não foi avisado.
  const candidatos = queue.filter((o) => o.isHighValue);
  if (candidatos.length === 0) return { alerted: 0, skipped: null };

  const ids = candidatos.map((o) => o.id);
  const naoAvisados = await db.query.orders.findMany({
    where: and(inArray(orders.id, ids), isNull(orders.recoveryAlertSentAt)),
    columns: { id: true },
  });
  const pendentes = new Set(naoAvisados.map((o) => o.id));
  const novos = candidatos.filter((o) => pendentes.has(o.id));
  if (novos.length === 0) return { alerted: 0, skipped: null };

  const linhas = novos
    .map(
      (o) => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #e8e2d8;">
        <div style="font-size:14px;color:#121212;">#${o.orderNumber} · ${o.customerName} · <strong>${money(o.totalCents)}</strong></div>
        <div style="font-size:12px;color:#8a857c;margin-top:2px;">Parado há ${o.minutesOld} min · ${o.customerPhone || "sem telefone"}</div>
        <div style="font-size:12px;color:#55534e;margin-top:4px;">${o.situation}</div>
        ${o.whatsappUrl ? `<a href="${o.whatsappUrl}" style="font-size:12px;color:#121212;">Falar no WhatsApp</a>` : ""}
      </td></tr>`,
    )
    .join("");

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br").replace(/\/$/, "");

  const enviado = await sendEmail({
    to: destinatarios,
    subject: `${novos.length} venda(s) de alto valor parada(s) · ALBIZIA`,
    html: emailShell(
      "Venda parada, vale ligar",
      `<p style="font-size:14px;line-height:1.6;color:#55534e;">
         Pedido(s) acima de ${money(settings.highValueCents)} sem pagamento há mais de ${settings.minutes} minutos.
         Quanto antes o contato, maior a chance de fechar.
       </p>
       <table style="width:100%;border-collapse:collapse;margin-top:8px;">${linhas}</table>
       <div style="text-align:center;margin-top:24px;">
         <a href="${site}/admin/carrinhos" style="display:inline-block;background:#121212;color:#f2ede5;text-decoration:none;padding:14px 32px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Abrir a fila</a>
       </div>`,
    ),
  });

  if (!enviado) return { alerted: 0, skipped: "falha ao enviar o e-mail" };

  // Marca só depois do envio confirmado: perder um alerta custa uma venda,
  // então preferimos repetir a tentativa na próxima rodada a marcar em vão.
  await db
    .update(orders)
    .set({ recoveryAlertSentAt: new Date() })
    .where(inArray(orders.id, novos.map((o) => o.id)));

  return { alerted: novos.length, skipped: null };
}
