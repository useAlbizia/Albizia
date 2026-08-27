"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { sendEmail, emailShell, money } from "@/lib/email";
import { logAudit } from "@/lib/audit";

export type RecoveryState = { ok?: boolean; error?: string };

// Emails a customer who started checkout but never paid, nudging them back.
// The cart lives in their browser, so the email lists what they left and links
// to each product page (and the site) rather than trying to restore the cart.
export async function sendRecovery(orderId: string): Promise<RecoveryState> {
  await requireAdmin();

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { product: { columns: { slug: true } } } } },
  });
  if (!order) return { error: "Pedido não encontrado." };
  if (order.status !== "pending") return { error: "Este pedido não está mais pendente." };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br";

  const itemsRows = order.items
    .map((i) => {
      const label = `${i.productName} (${i.size}) × ${i.quantity}`;
      const cell = i.product?.slug
        ? `<a href="${siteUrl}/produto/${i.product.slug}" style="color:#121212;text-decoration:underline;">${label}</a>`
        : label;
      return `<tr><td style="padding:6px 0;color:#55534e;">${cell}</td>
        <td style="padding:6px 0;text-align:right;">${money(i.unitPriceCents * i.quantity)}</td></tr>`;
    })
    .join("");

  const sent = await sendEmail({
    to: order.customerEmail,
    subject: `Você esqueceu algo, ${order.customerName.split(" ")[0]}? · ALBIZIA`,
    html: emailShell(
      "Seu carrinho está esperando",
      `<p style="font-size:14px;line-height:1.6;color:#55534e;">Notamos que você deixou algumas peças para trás. Elas continuam disponíveis:</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
         ${itemsRows}
         <tr><td style="padding-top:12px;border-top:1px solid #d9d2c6;text-transform:uppercase;letter-spacing:1px;color:#55534e;">Total</td>
         <td style="padding-top:12px;border-top:1px solid #d9d2c6;text-align:right;font-size:16px;">${money(order.subtotalCents)}</td></tr>
       </table>
       <div style="text-align:center;margin-top:28px;">
         <a href="${siteUrl}" style="display:inline-block;background:#121212;color:#f2ede5;text-decoration:none;padding:14px 32px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Voltar à loja</a>
       </div>`
    ),
  });

  if (!sent) {
    return { error: "Não foi possível enviar o e-mail agora. Tente novamente." };
  }

  await db
    .update(orders)
    .set({ recoveryEmailSentAt: new Date() })
    .where(eq(orders.id, orderId));

  await logAudit({
    action: "cart.recovery_email",
    entity: "order",
    entityId: orderId,
    detail: { orderNumber: order.orderNumber, to: order.customerEmail },
  });

  revalidatePath("/admin/carrinhos");
  return { ok: true };
}
