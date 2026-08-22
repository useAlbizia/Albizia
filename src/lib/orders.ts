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
  totalCents: number;
  items: { productName: string; size: string; quantity: number; unitPriceCents: number }[];
};

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
    totalCents: order.totalCents,
    items: order.items.map((i) => ({
      productName: i.productName,
      size: i.size,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
  };
}
