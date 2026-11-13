import { NextResponse, type NextRequest } from "next/server";
import { registrarErro } from "@/lib/erros";
import { and, eq, inArray, lt, ne, sql } from "drizzle-orm";
import {
  MercadoPagoConfig,
  Payment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { db } from "@/lib/db/client";
import { orders, productVariants, analyticsEvents } from "@/lib/db/schema";
import { sendOrderPaidEmails } from "@/lib/order-notify";
import { incrementCouponUse } from "@/lib/coupons";
import { getPaymentSettings } from "@/lib/payments";
import { aplicarValoresMp } from "@/lib/mp-sync";
import type { PagamentoMp } from "@/lib/mp-valores";

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
        // Aviso de pagamento com assinatura que não bate: alguém tentando se
        // passar pelo Mercado Pago, ou a chave secreta trocada na Vercel.
        await registrarErro({
          origem: "servidor",
          tipo: "seguranca",
          area: "seguranca",
          gravidade: "alta",
          caminho: "POST /api/mercadopago/webhook",
          mensagem: `Aviso de pagamento recusado: assinatura inválida (${err.reason}).`,
          detalhe: `data.id ${dataId ?? "?"} · ip ${request.headers.get("x-forwarded-for") ?? "?"}`,
        });
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
  // Same credentials the checkout used: Admin → Pagamentos, env var as fallback.
  const { accessToken } = await getPaymentSettings();
  if (!accessToken) {
    console.error("Webhook received but no Mercado Pago access token is configured");
    await registrarErro({
      origem: "servidor",
      area: "pagamento",
      gravidade: "critica",
      caminho: "POST /api/mercadopago/webhook",
      mensagem: "Chegou aviso de pagamento, mas o Mercado Pago não está conectado: o pedido não foi baixado.",
      detalhe: `data.id ${dataId}`,
    });
    return NextResponse.json({ ok: true });
  }
  const mpClient = new MercadoPagoConfig({ accessToken });
  let payment;
  try {
    payment = await new Payment(mpClient).get({ id: dataId });
  } catch (err) {
    // Unknown/invalid id, or a transient MP API error — nothing we can act
    // on. Respond 200 so MP doesn't retry a lookup that will never resolve.
    console.error("Mercado Pago payment lookup failed", dataId, err);
    // Se for um pagamento real, ele fica sem baixar (o pedido não vira
    // "pago"). A conferência automática da tela Sócios tenta de novo, mas
    // vale olhar no Mercado Pago.
    await registrarErro({
      origem: "servidor",
      area: "pagamento",
      gravidade: "critica",
      caminho: "POST /api/mercadopago/webhook",
      mensagem: `Não consegui consultar um pagamento avisado pelo Mercado Pago (id ${dataId}).`,
      detalhe: err instanceof Error ? (err.stack ?? err.message) : JSON.stringify(err).slice(0, 1500),
    });
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
    if (payment.status === "approved") {
      await registrarErro({
        origem: "servidor",
        area: "pagamento",
        gravidade: "critica",
        caminho: "POST /api/mercadopago/webhook",
        mensagem: `Pagamento APROVADO de um pedido que não existe no site (referência ${orderId}).`,
        detalhe: `pagamento ${payment.id} · valor ${payment.transaction_amount ?? "?"}`,
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Taxa, líquido, estorno e data de liberação, para o caixa da empresa se
  // montar sozinho. Vale para qualquer status: é assim que um estorno feito
  // semanas depois tira a venda do caixa. Falha aqui nunca derruba o resto
  // do webhook, que cuida de coisa mais importante (estoque, e-mail).
  await aplicarValoresMp(order.id, payment as PagamentoMp).catch((err) =>
    console.error("Falha ao gravar valores do Mercado Pago", order.id, err),
  );

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

    // Estoque ficou negativo: vendeu peça que não tinha. Precisa repor ou
    // falar com o cliente antes de prometer prazo.
    if (justPaid) {
      const ids = order.items.map((i) => i.productVariantId).filter((v): v is string => !!v);
      if (ids.length) {
        const negativos = await db
          .select({ id: productVariants.id, tamanho: productVariants.size, estoque: productVariants.stock })
          .from(productVariants)
          .where(and(inArray(productVariants.id, ids), lt(productVariants.stock, 0)))
          .catch(() => []);
        if (negativos.length) {
          await registrarErro({
            origem: "servidor",
            area: "estoque",
            gravidade: "critica",
            caminho: "POST /api/mercadopago/webhook",
            mensagem: `Pedido #${order.orderNumber} foi pago, mas faltou estoque (${negativos.map((n) => `${n.tamanho}: ${n.estoque}`).join(", ")}).`,
            detalhe: `Pedido ${order.id}. Reponha o estoque ou fale com o cliente.`,
          });
        }
      }
    }

    // Send confirmation emails only on the first transition to paid, and
    // outside the DB transaction (email must never hold or fail the tx).
    if (justPaid) {
      await db
        .insert(analyticsEvents)
        .values({ type: "order_paid", valueCents: order.totalCents })
        .catch(() => {});
      if (order.couponCode) {
        await incrementCouponUse(order.couponCode).catch(() => {});
      }
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
