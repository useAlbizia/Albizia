import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { orders } from "./db/schema";
import { sendEmail, emailShell, money, SITE } from "./email";

type OrderWithItems = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

function loadOrder(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
}

function summaryHtml(order: OrderWithItems): string {
  const itemsRows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#55534e;">${i.productName} (${i.size}) × ${i.quantity}</td>
         <td style="padding:6px 0;text-align:right;">${money(i.unitPriceCents * i.quantity)}</td></tr>`
    )
    .join("");

  const shippingLabel = order.shippingCents === 0 ? "Grátis" : money(order.shippingCents);
  const discountRow =
    order.discountCents > 0
      ? `<tr><td style="padding:4px 0;color:#8a857c;">Desconto${order.couponCode ? ` (${order.couponCode})` : ""}</td>
         <td style="padding:4px 0;text-align:right;color:#8a857c;">−${money(order.discountCents)}</td></tr>`
      : "";
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
      ${itemsRows}
      <tr><td style="padding-top:12px;border-top:1px solid #d9d2c6;color:#8a857c;">Subtotal</td>
      <td style="padding-top:12px;border-top:1px solid #d9d2c6;text-align:right;color:#8a857c;">${money(order.subtotalCents)}</td></tr>
      ${discountRow}
      <tr><td style="padding:4px 0;color:#8a857c;">Frete</td>
      <td style="padding:4px 0;text-align:right;color:#8a857c;">${shippingLabel}</td></tr>
      <tr><td style="padding-top:8px;text-transform:uppercase;letter-spacing:1px;color:#55534e;">Total</td>
      <td style="padding-top:8px;text-align:right;font-size:16px;">${money(order.totalCents)}</td></tr>
    </table>`;
}

/** Link que abre /acompanhar já com o pedido na tela, sem a pessoa digitar nada. */
export function trackLink(orderNumber: number, email: string): string {
  const p = new URLSearchParams({ numero: String(orderNumber), email });
  return `${SITE.replace(/\/$/, "")}/acompanhar?${p.toString()}`;
}

async function customerReceipt(order: OrderWithItems): Promise<boolean> {
  return sendEmail({
    to: order.customerEmail,
    subject: `Pedido #${order.orderNumber} confirmado · ALBIZIA`,
    html: emailShell(
      "Pagamento confirmado",
      `<p style="font-size:14px;line-height:1.6;color:#55534e;">Olá, ${order.customerName}. Recebemos a confirmação do seu pagamento e seu pedido já está sendo preparado.</p>
       ${summaryHtml(order)}
       <div style="text-align:center;margin:28px 0 8px;">
         <a href="${trackLink(order.orderNumber, order.customerEmail)}" style="display:inline-block;background:#121212;color:#f2ede5;text-decoration:none;padding:14px 32px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Acompanhar pedido</a>
       </div>
       <p style="font-size:13px;color:#8a857c;margin-top:20px;">Você recebe uma nova mensagem quando o pedido for enviado.</p>`
    ),
  });
}

/**
 * Reenvia só o recibo do cliente.
 *
 * Existe para o caso do e-mail digitado errado: depois de corrigir o endereço
 * no painel, o cliente precisa receber a confirmação que nunca chegou. Os
 * fundadores não são avisados de novo, porque para eles nada mudou.
 */
export async function resendCustomerReceipt(orderId: string): Promise<boolean> {
  const order = await loadOrder(orderId);
  if (!order) return false;
  return customerReceipt(order);
}

// Sends the "payment confirmed" emails for an order: a receipt to the
// customer and an alert to the founders. Called from the Mercado Pago
// webhook once an order flips to paid. Never throws.
export async function sendOrderPaidEmails(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order) return;

  await customerReceipt(order);

  // Founder alert. ORDER_NOTIFICATION_EMAIL may list several recipients,
  // comma-separated (e.g. both founders).
  const notify = (process.env.ORDER_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (notify.length > 0) {
    const addr = order.shippingAddress as Record<string, string>;
    await sendEmail({
      to: notify,
      replyTo: order.customerEmail,
      subject: `Novo pedido pago #${order.orderNumber} · ${money(order.totalCents)}`,
      html: emailShell(
        `Novo pedido #${order.orderNumber}`,
        `<p style="font-size:14px;color:#55534e;">${order.customerName} · ${order.customerEmail} · ${order.customerPhone}</p>
         <p style="font-size:13px;color:#8a857c;">${addr.street}, ${addr.number}${addr.complement ? ", " + addr.complement : ""} · ${addr.neighborhood} · ${addr.city}/${addr.state} · ${addr.zip}</p>
         ${summaryHtml(order)}`
      ),
    });
  }
}
