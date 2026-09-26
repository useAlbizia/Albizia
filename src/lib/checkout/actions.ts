"use server";

import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { orders, orderItems, productVariants, analyticsEvents } from "@/lib/db/schema";
import type { CartItem } from "@/lib/cart-context";
import {
  quoteMelhorEnvio,
  quoteShipping,
  type CartLine,
  type ShippingOption,
} from "@/lib/shipping";
import { validateCoupon, type CouponResult } from "@/lib/coupons";
import { isValidDocument, onlyDigits } from "@/lib/fiscal";

/**
 * As linhas do carrinho com peso e medida, lidas do BANCO.
 *
 * As medidas nunca vêm do cliente. Quem manda o peso manda o preço do frete,
 * e um carrinho forjado com 1g de camiseta seria frete grátis pago pela loja.
 */
async function linesFromItems(items: CartItem[]): Promise<CartLine[]> {
  const variantIds = [...new Set(items.map((i) => i.variantId))];
  if (variantIds.length === 0) return [];

  const variants = await db.query.productVariants.findMany({
    where: inArray(productVariants.id, variantIds),
    with: { product: true },
  });

  const linhas: CartLine[] = [];
  for (const item of items) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v) continue;
    linhas.push({
      name: v.product.name,
      quantity: item.quantity,
      unitPriceCents: v.product.priceCents,
      weightGrams: v.product.weightGrams,
      lengthCm: v.product.lengthCm,
      widthCm: v.product.widthCm,
      heightCm: v.product.heightCm,
    });
  }
  return linhas;
}

/**
 * As opções de frete para o CEP, para o cliente ESCOLHER.
 *
 * Antes isso devolvia só o valor mais barato e a escolha era invisível. Sem
 * saber qual serviço foi cotado é impossível comprar a etiqueta depois, e o
 * cliente também não podia optar por pagar mais para receber antes.
 */
export async function quoteFreteAction(
  cep: string,
  items: CartItem[]
): Promise<{ options: ShippingOption[]; flatCents: number | null }> {
  const lines = await linesFromItems(items);
  const options = await quoteMelhorEnvio(cep, lines);
  if (options.length > 0) return { options, flatCents: null };

  // Melhor Envio fora do ar, sem token, ou método "frete fixo": o checkout
  // não pode travar, então mostra o valor único e segue.
  const subtotal = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
  const { cents } = await quoteShipping(cep, subtotal, lines);
  return { options: [], flatCents: cents };
}

// Checkout preview: re-checks a coupon against the true server-side subtotal so
// the customer sees the real discount before paying.
export async function applyCoupon(code: string, subtotalCents: number): Promise<CouponResult> {
  return validateCoupon(code, subtotalCents);
}

const checkoutSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  // Exigido pela NF-e de venda de produto. Sem isso a nota não sai, então é
  // melhor pedir aqui do que caçar o cliente depois da compra.
  document: z
    .string()
    .refine((v) => isValidDocument(v), "CPF inválido"),
  street: z.string().min(1, "Endereço obrigatório"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro obrigatório"),
  city: z.string().min(1, "Cidade obrigatória"),
  state: z.string().length(2, "UF inválida"),
  zip: z.string().min(8, "CEP inválido"),
});

export type CheckoutState = {
  error?: string;
  // Set once the order exists and the customer can pay. The payment itself
  // happens in the Payment Brick, on our own page.
  orderId?: string;
  totalCents?: number;
};

// Re-derives price and stock from the database for every line — the client
// cart is only ever a display convenience, never a source of truth for an
// amount we're about to charge.
export async function createPendingOrder(
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
    document: formData.get("document"),
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
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
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
      weightGrams: variant.product.weightGrams,
      lengthCm: variant.product.lengthCm,
      widthCm: variant.product.widthCm,
      heightCm: variant.product.heightCm,
    });
  }

  const subtotalCents = lineItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const totalQty = lineItems.reduce((sum, i) => sum + i.quantity, 0);

  // Shipping is computed server-side (never trust a client-sent amount). For
  // the Melhor Envio method this is a live carrier quote for the CEP.
  //
  // O serviço escolhido vem do formulário, mas só como preferência: a cotação
  // é refeita aqui e o preço que vale é o do servidor. Se o serviço sumiu
  // entre a tela e o envio, cai no mais barato em vez de derrubar a compra.
  const escolhaCliente = Number(formData.get("shippingServiceId") ?? "") || null;
  const linhasFrete: CartLine[] = lineItems.map((li) => ({
    name: li.productName,
    quantity: li.quantity,
    unitPriceCents: li.unitPriceCents,
    weightGrams: li.weightGrams,
    lengthCm: li.lengthCm,
    widthCm: li.widthCm,
    heightCm: li.heightCm,
  }));
  const frete = await quoteShipping(data.zip, subtotalCents, linhasFrete, escolhaCliente);
  const shippingCents = frete.cents;

  // Coupon is re-validated here against the true subtotal — the client preview
  // is never trusted. If it's no longer valid we stop rather than silently
  // charging full price after the customer saw a discounted total.
  const rawCoupon = ((formData.get("couponCode") as string | null) ?? "").trim();
  let discountCents = 0;
  let couponCode: string | null = null;
  if (rawCoupon) {
    const result = await validateCoupon(rawCoupon, subtotalCents);
    if (!result.ok) return { error: `Cupom: ${result.message}` };
    discountCents = result.discountCents;
    couponCode = result.code;
  }

  const totalCents = subtotalCents - discountCents + shippingCents;

  const [order] = await db
    .insert(orders)
    .values({
      status: "pending",
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      customerDocument: onlyDigits(data.document),
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
      discountCents,
      couponCode,
      totalCents,
      // Qual serviço foi cotado. É isto que permite comprar a etiqueta
      // depois sem adivinhar, e cobrar da loja o mesmo que se cobrou do
      // cliente.
      meServiceId: frete.option?.id ?? null,
      meServiceName: frete.option?.name ?? null,
      meCompany: frete.option?.company ?? null,
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

  // Payment now happens on our own page, in the Payment Brick. The client gets
  // only the order id and the amount to render; when the payment is actually
  // processed the amount is re-read from THIS row, so a tampered client can
  // never change what gets charged.
  return { orderId: order.id, totalCents };
}
