import { NextResponse, type NextRequest } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { db } from "@/lib/db/client";
import { orders, productVariants } from "@/lib/db/schema";
import { sendOrderPaidEmails } from "@/lib/order-notify";

// Mercado Pago is the only source of truth for payment status — this
// endpoint never trusts anything the customer's browser reports back.
export async function POST(request: NextRequest) {
  const dataId = request.nextUrl.searchParams.get("data.id");
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret,
        toleranceSeconds: 300,
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        console.error("Webhook signature rejected", err.reason, err.requestId);
        return NextResponse.json({ error: "invalid signature" }, { status: 401 });
      }
      throw err;
    }
  } else {
    // No production domain/webhook registered yet — see .env.local.example.
    console.warn("MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature check (dev only).");
  }

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  // Re-fetch the payment by id from MP's own API — the webhook body/query is
  // only ever a "something changed, go check" ping, never trusted for the
  // actual amount or status.
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });
  let payment;
  try {
    payment = await new Payment(mpClient).get({ id: dataId });
  } catch (err) {
    // Unknown/invalid id, or a transient MP API error — nothing we can act
    // on. Respond 200 so MP doesn't retry a lookup that will never resolve.
    console.error("Mercado Pago payment lookup failed", dataId, err);
    return NextResponse.json({ ok: true });
  }

  const orderId = payment.external_reference;
  if (!orderId) {
    return NextResponse.json({ ok: true });
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) {
    return NextResponse.json({ ok: true });
  }

  if (payment.status === "approved") {
    const justPaid = await db.transaction(async (tx) => {
      // Guard is part of the WHERE clause, not a separate check-then-act —
      // makes the "only the first approval wins" rule atomic even if two
      // webhook deliveries for the same payment land at the same time
      // (Mercado Pago retries/redelivers by design).
      const updated = await tx
        .update(orders)
        .set({
          status: "paid",
          paidAt: new Date(),
          mpPaymentId: String(payment.id),
          mpStatus: payment.status ?? null,
          paymentMethod: payment.payment_method_id ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
        .returning({ id: orders.id });

      if (updated.length === 0) return false; // already marked paid by a prior delivery

      for (const item of order.items) {
        if (!item.productVariantId) continue;
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(eq(productVariants.id, item.productVariantId));
      }
      return true;
    });

    // Send confirmation emails only on the first transition to paid, and
    // outside the DB transaction (email must never hold or fail the tx).
    if (justPaid) {
      await sendOrderPaidEmails(order.id);
    }
  } else if (payment.status && payment.status !== order.mpStatus) {
    // Track cancelled/rejected/pending transitions for the admin order view
    // without touching stock.
    await db
      .update(orders)
      .set({
        mpStatus: payment.status,
        mpPaymentId: String(payment.id),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  }

  return NextResponse.json({ ok: true });
}
