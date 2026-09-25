"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { orders, siteSettings } from "@/lib/db/schema";
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

export type RecoverySettingsState = { ok?: boolean; error?: string };

const settingsSchema = z.object({
  minutes: z.coerce.number().int().min(5).max(10080),
  highValue: z.coerce.number().min(0),
  alertEmail: z.string().max(200).default(""),
});

// Os limites da fila de recuperação. Ficam no banco e não no código para o
// fundador ajustar sozinho conforme aprende o ritmo das vendas.
export async function saveRecoverySettings(
  _prev: RecoverySettingsState,
  formData: FormData,
): Promise<RecoverySettingsState> {
  await requireAdmin();

  const parsed = settingsSchema.safeParse({
    minutes: formData.get("minutes") ?? 60,
    highValue: formData.get("highValue") ?? 0,
    alertEmail: formData.get("alertEmail") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const email = d.alertEmail.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "E-mail de alerta inválido." };
  }

  const values = {
    recoveryMinutes: d.minutes,
    recoveryHighValueCents: Math.round(d.highValue * 100),
    recoveryAlertEmail: email,
    updatedAt: new Date(),
  };

  await db
    .insert(siteSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  await logAudit({
    action: "settings.recuperacao",
    entity: "site_settings",
    entityId: "1",
    detail: { minutes: d.minutes, highValueCents: values.recoveryHighValueCents },
  });

  revalidatePath("/admin/carrinhos");
  return { ok: true };
}
