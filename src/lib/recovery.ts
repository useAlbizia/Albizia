import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { orders, siteSettings } from "./db/schema";

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
