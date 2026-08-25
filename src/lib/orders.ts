import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { orders } from "./db/schema";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago — em preparação",
  shipped: "Enviado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export type TrackedOrder = {
  orderNumber: number;
  status: string;
  statusLabel: string;
  createdAt: Date;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  couponCode: string | null;
  totalCents: number;
  trackingCode: string | null;
  items: { productName: string; size: string; quantity: number; unitPriceCents: number }[];
};

// A customer's own order history, keyed by the email on their account. Used by
// the logged-in account area (/conta).
export async function getCustomerOrders(email: string) {
  const clean = email.trim().toLowerCase();
  if (!clean) return [];
  const rows = await db.query.orders.findMany({
    where: eq(sql`lower(${orders.customerEmail})`, clean),
    orderBy: (o, { desc }) => desc(o.createdAt),
    columns: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      trackingCode: true,
      createdAt: true,
    },
  });
  return rows.map((o) => ({
    ...o,
    statusLabel: ORDER_STATUS_LABEL[o.status] ?? o.status,
  }));
}

// Looks up an order for public tracking. Requires BOTH the order number and
// the matching email (case-insensitive) — the email is what stops anyone
// from browsing other people's orders by guessing sequential numbers.
export async function getOrderForTracking(
  orderNumber: number,
  email: string
): Promise<TrackedOrder | null> {
  if (!Number.isFinite(orderNumber) || !email.trim()) return null;

  const order = await db.query.orders.findFirst({
    where: and(
      eq(orders.orderNumber, orderNumber),
      eq(sql`lower(${orders.customerEmail})`, email.trim().toLowerCase())
    ),
    with: { items: true },
  });
  if (!order) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status] ?? order.status,
    createdAt: order.createdAt,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    discountCents: order.discountCents,
    couponCode: order.couponCode,
    totalCents: order.totalCents,
    trackingCode: order.trackingCode,
    items: order.items.map((i) => ({
      productName: i.productName,
      size: i.size,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  };
}
