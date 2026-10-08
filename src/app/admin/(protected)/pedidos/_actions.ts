"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { sendEmail, emailShell } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { resendCustomerReceipt } from "@/lib/order-notify";

const VALID_STATUSES = ["pending", "paid", "shipped", "cancelled", "refunded"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status)) return;

  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
  await logAudit({ action: "order.status", entity: "order", entityId: orderId, detail: { status } });
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
}

export type TrackingState = { ok?: boolean; error?: string };

// Saves a carrier tracking code, marks the order shipped, and emails the
// customer the code. Called from the order detail page.
export async function saveTracking(
  orderId: string,
  _prev: TrackingState,
  formData: FormData
): Promise<TrackingState> {
  await requireAdmin();

  const code = ((formData.get("trackingCode") as string | null) ?? "").trim();
  if (!code) return { error: "Informe o código de rastreio." };

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "Pedido não encontrado." };

  await db
    .update(orders)
    .set({ trackingCode: code, status: "shipped", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await sendEmail({
    to: order.customerEmail,
    subject: `Seu pedido #${order.orderNumber} foi enviado · ALBIZIA`,
    html: emailShell(
      "Pedido enviado",
      `<p style="font-size:14px;line-height:1.6;color:#55534e;">Olá, ${order.customerName}. Seu pedido está a caminho.</p>
       <p style="font-size:14px;line-height:1.6;color:#55534e;">Código de rastreio:</p>
       <p style="font-size:20px;letter-spacing:2px;text-align:center;margin:16px 0;padding:14px;border:1px solid #d9d2c6;">${code}</p>
       <p style="font-size:13px;color:#8a857c;">Acompanhe a entrega pelos Correios ou pela transportadora com o código acima.</p>`
    ),
  });

  await logAudit({
    action: "order.tracking",
    entity: "order",
    entityId: orderId,
    detail: { orderNumber: order.orderNumber, trackingCode: code },
  });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

export type EmailFixState = { ok?: boolean; error?: string; mensagem?: string };

/**
 * Corrige o e-mail de um pedido pelo painel e, se pedido, reenvia o recibo.
 *
 * É o último elo da cadeia do cliente que digitou "gmial": ele liga com o
 * número do pedido, vocês acham o pedido pela busca, corrigem aqui, e a
 * confirmação que nunca chegou finalmente chega. Ao contrário da correção
 * feita pelo próprio cliente, esta vale em qualquer status.
 */
export async function corrigirEmailAdmin(
  orderId: string,
  _prev: EmailFixState,
  formData: FormData
): Promise<EmailFixState> {
  await requireAdmin();

  const email = ((formData.get("email") as string | null) ?? "").trim().toLowerCase();
  const reenviar = formData.get("reenviar") === "on";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "Pedido não encontrado." };

  const anterior = order.customerEmail;
  await db
    .update(orders)
    .set({ customerEmail: email, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await logAudit({
    action: "order.email",
    entity: "order",
    entityId: orderId,
    detail: { orderNumber: order.orderNumber, de: anterior, para: email },
  });

  let mensagem = "E-mail corrigido.";
  // Recibo só faz sentido para pedido que foi pago. Reenviar "pagamento
  // confirmado" de um pedido pendente seria mentir para o cliente.
  if (reenviar && (order.status === "paid" || order.status === "shipped")) {
    const ok = await resendCustomerReceipt(orderId);
    mensagem = ok ? "E-mail corrigido e confirmação reenviada." : "E-mail corrigido, mas o reenvio falhou.";
  } else if (reenviar) {
    mensagem = "E-mail corrigido. Não reenviei a confirmação porque o pedido ainda não foi pago.";
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true, mensagem };
}
