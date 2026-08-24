"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orders, orderItems, productVariants, analyticsEvents } from "@/lib/db/schema";
import type { CartItem } from "@/lib/cart-context";
import { getShippingConfig, computeShipping } from "@/lib/shipping";

const checkoutSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  street: z.string().min(1, "Endereço obrigatório"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório"),
  city: z.string().min(1, "Cidade obrigatória"),
  state: z.string().length(2, "UF inválida"),
  zip: z.string().min(8, "CEP inválido"),
});

export type CheckoutState = { error?: string };

// Re-derives price and stock from the database for every line — the client
// cart is only ever a display convenience, never a source of truth for an
// amount we're about to charge.
export async function createOrder(
  items: CartItem[],
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  if (items.length === 0) {
    return { error: "Seu carrinho está vazio." };
  }

  const parsed = checkoutSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: formData.get("complement") || undefined,
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    zip: formData.get("zip"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const data = parsed.data;

  const variantIds = [...new Set(items.map((i) => i.variantId))];
  const variants = await db.query.productVariants.findMany({
    where: inArray(productVariants.id, variantIds),
    with: { product: true },
  });

  const lineItems: {
    variantId: string;
    productId: string;
    productName: string;
    size: string;
    unitPriceCents: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant) {
      return { error: `Item não encontrado: ${item.name}.` };
    }
    if (variant.stock < item.quantity) {
      return { error: `Estoque insuficiente para ${variant.product.name} (${variant.size}).` };
    }
    lineItems.push({
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      size: variant.size,
      unitPriceCents: variant.product.priceCents,
      quantity: item.quantity,
    });
  }

  const subtotalCents = lineItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  // Shipping is computed server-side (never trust a client-sent amount).
  const shippingConfig = await getShippingConfig();
  const shippingCents = computeShipping(subtotalCents, shippingConfig, data.zip);
  const totalCents = subtotalCents + shippingCents;

  const [order] = await db
    .insert(orders)
    .values({
      status: "pending",
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      shippingAddress: {
        street: data.street,
        number: data.number,
        complement: data.complement ?? null,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
      subtotalCents,
      shippingCents,
      totalCents,
    })
    .returning();

  await db.insert(orderItems).values(
    lineItems.map((li) => ({
      orderId: order.id,
      productId: li.productId,
      productVariantId: li.variantId,
      productName: li.productName,
      size: li.size,
      unitPriceCents: li.unitPriceCents,
      quantity: li.quantity,
    }))
  );

  await db
    .insert(analyticsEvents)
    .values({ type: "order_created", valueCents: subtotalCents })
    .catch(() => {});

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! });

  let checkoutUrl: string | undefined;
  try {
    const preference = await new Preference(mpClient).create({
      body: {
        items: [
          ...lineItems.map((li) => ({
            id: li.variantId,
            title: `${li.productName} (${li.size})`,
            quantity: li.quantity,
            unit_price: li.unitPriceCents / 100,
            currency_id: "BRL",
          })),
          ...(shippingCents > 0
            ? [
                {
                  id: "frete",
                  title: "Frete",
                  quantity: 1,
                  unit_price: shippingCents / 100,
                  currency_id: "BRL",
                },
              ]
            : []),
        ],
        payer: { name: data.name, email: data.email },
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/checkout/confirmacao?order=${order.id}`,
          pending: `${siteUrl}/checkout/confirmacao?order=${order.id}`,
          failure: `${siteUrl}/checkout?falha=1`,
        },
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      },
    });
    checkoutUrl = preference.sandbox_init_point ?? preference.init_point ?? undefined;

    if (preference.id) {
      await db.update(orders).set({ mpPreferenceId: preference.id }).where(eq(orders.id, order.id));
    }
  } catch (err) {
    console.error("Mercado Pago preference creation failed", err);
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  if (!checkoutUrl) {
    return { error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." };
  }

  redirect(checkoutUrl);
}
