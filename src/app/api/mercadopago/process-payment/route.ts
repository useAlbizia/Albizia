import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/lib/db/client";
import { orders } from "@/lib/db/schema";
import { getPaymentSettings } from "@/lib/payments";

// Processes a payment submitted by the Payment Brick on our own checkout page.
//
// Three rules hold this together:
//  1. The card number NEVER reaches this server. The Brick tokenizes it in the
//     browser directly against Mercado Pago; we only ever see that token.
//  2. The charged amount is read from OUR orders row, never from the request
//     body, so a tampered client cannot change the price.
//  3. Marking an order "paid" is left entirely to the webhook, which is the
//     single source of truth (it also handles stock and coupon counting).

type BrickFormData = {
  token?: string;
  issuer_id?: string;
  payment_method_id?: string;
  installments?: number;
  payer?: {
    email?: string;
    identification?: { type?: string; number?: string };
  };
};

export async function POST(request: NextRequest) {
  let body: { orderId?: string; formData?: BrickFormData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const orderId = (body.orderId ?? "").trim();
  const form = body.formData;
  if (!orderId || !form?.payment_method_id) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Este pedido já foi finalizado." }, { status: 409 });
  }

  const { accessToken } = await getPaymentSettings();
  if (!accessToken) {
    console.error("Mercado Pago access token is not configured");
    return NextResponse.json({ error: "Pagamento indisponível no momento." }, { status: 503 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://usealbizia.com.br").replace(
    /\/$/,
    "",
  );
  const client = new MercadoPagoConfig({ accessToken });

  try {
    const payment = await new Payment(client).create({
      body: {
        // Amount and reference come from our own row, not from the browser.
        transaction_amount: order.totalCents / 100,
        description: `ALBIZIA · Pedido #${order.orderNumber}`,
        external_reference: order.id,
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        payment_method_id: form.payment_method_id,
        token: form.token,
        installments: form.installments ?? 1,
        // The Brick reports the issuer as a string; the SDK expects a number.
        issuer_id: form.issuer_id ? Number(form.issuer_id) : undefined,
        payer: {
          email: form.payer?.email || order.customerEmail,
          identification: form.payer?.identification,
        },
      },
      // A fresh key per attempt: a rejected card has to be retryable with
      // another one. The "already finalized" guard above is what prevents an
      // order from being charged twice.
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    });

    // Record what we learned. The transition to "paid" belongs to the webhook.
    await db
      .update(orders)
      .set({
        mpPaymentId: payment.id ? String(payment.id) : null,
        mpStatus: payment.status ?? null,
        paymentMethod: payment.payment_method_id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const pix = payment.point_of_interaction?.transaction_data;

    return NextResponse.json({
      status: payment.status,
      statusDetail: payment.status_detail,
      // Pix: copy-and-paste code plus the QR image, both rendered on our page.
      pixCode: pix?.qr_code ?? null,
      pixQrBase64: pix?.qr_code_base64 ?? null,
      // Boleto: the printable slip.
      boletoUrl: payment.transaction_details?.external_resource_url ?? null,
      orderId: order.id,
    });
  } catch (err) {
    console.error("Mercado Pago payment failed", err);
    return NextResponse.json(
      { error: "Não foi possível processar o pagamento. Confira os dados e tente novamente." },
      { status: 502 },
    );
  }
}
