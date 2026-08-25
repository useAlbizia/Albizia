import "server-only";
import { and, count, desc, gte, inArray, sql } from "drizzle-orm";
import { db } from "./db/client";
import { orders, orderItems, productVariants, products } from "./db/schema";

// Orders that count as revenue: paid, and paid-then-shipped. Cancelled,
// refunded and still-pending orders are excluded everywhere below.
const REVENUE_STATUSES = ["paid", "shipped"] as const;

// Brazil dropped DST in 2019, so BRT is a fixed UTC-3. Start-of-today in BRT
// is that calendar date at 03:00 UTC — used so "Hoje" means the founders' day,
// not the server's UTC day.
export function brtDayStartUtc(d = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  return new Date(`${ymd}T03:00:00.000Z`);
}

// coalesce(paid_at, created_at): manually-marked-paid orders may lack paidAt.
const revenueDate = sql`coalesce(${orders.paidAt}, ${orders.createdAt})`;

async function revenueSince(since: Date): Promise<{ cents: number; n: number }> {
  const [r] = await db
    .select({
      cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`,
      n: count(),
    })
    .from(orders)
    .where(and(inArray(orders.status, [...REVENUE_STATUSES]), gte(revenueDate, since)));
  return { cents: Number(r.cents), n: Number(r.n) };
}

export type DashboardMetrics = {
  today: { cents: number; n: number };
  last7: { cents: number; n: number };
  last30: { cents: number; n: number };
  allTime: { cents: number; n: number; avgTicketCents: number };
  pending: { cents: number; n: number };
  lowStockCount: number;
  recent: {
    id: string;
    orderNumber: number;
    customerName: string;
    totalCents: number;
    status: string;
    createdAt: Date;
  }[];
};

export async function getDashboardMetrics(lowStockThreshold: number): Promise<DashboardMetrics> {
  const now = Date.now();
  const [today, last7, last30, allTimeRows, pendingRows, lowStockRows, recent] = await Promise.all([
    revenueSince(brtDayStartUtc()),
    revenueSince(new Date(now - 7 * 86400000)),
    revenueSince(new Date(now - 30 * 86400000)),
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`, n: count() })
      .from(orders)
      .where(inArray(orders.status, [...REVENUE_STATUSES])),
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`, n: count() })
      .from(orders)
      .where(inArray(orders.status, ["pending"])),
    db
      .select({ n: count() })
      .from(productVariants)
      .where(sql`${productVariants.stock} <= ${lowStockThreshold}`),
    db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      limit: 8,
      columns: {
        id: true,
        orderNumber: true,
        customerName: true,
        totalCents: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const allTime = {
    cents: Number(allTimeRows[0].cents),
    n: Number(allTimeRows[0].n),
    avgTicketCents: allTimeRows[0].n ? Math.round(Number(allTimeRows[0].cents) / Number(allTimeRows[0].n)) : 0,
  };

  return {
    today,
    last7,
    last30,
    allTime,
    pending: { cents: Number(pendingRows[0].cents), n: Number(pendingRows[0].n) },
    lowStockCount: Number(lowStockRows[0].n),
    recent,
  };
}

export type TopProduct = { productName: string; quantity: number; revenueCents: number };

export type FinanceReport = {
  days: number;
  revenueCents: number;
  paidOrders: number;
  avgTicketCents: number;
  pendingCents: number;
  pendingOrders: number;
  refundedCents: number;
  refundedOrders: number;
  topProducts: TopProduct[];
};

export async function getFinanceReport(days: number): Promise<FinanceReport> {
  const since = new Date(Date.now() - days * 86400000);

  const [paidRows, pendingRows, refundedRows, top] = await Promise.all([
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`, n: count() })
      .from(orders)
      .where(and(inArray(orders.status, [...REVENUE_STATUSES]), gte(revenueDate, since))),
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`, n: count() })
      .from(orders)
      .where(and(inArray(orders.status, ["pending"]), gte(orders.createdAt, since))),
    db
      .select({ cents: sql<number>`coalesce(sum(${orders.totalCents}), 0)`, n: count() })
      .from(orders)
      .where(and(inArray(orders.status, ["refunded"]), gte(orders.createdAt, since))),
    db
      .select({
        productName: orderItems.productName,
        quantity: sql<number>`sum(${orderItems.quantity})`,
        revenueCents: sql<number>`sum(${orderItems.unitPriceCents} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
      .where(and(inArray(orders.status, [...REVENUE_STATUSES]), gte(revenueDate, since)))
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${orderItems.unitPriceCents} * ${orderItems.quantity})`))
      .limit(10),
  ]);

  const revenueCents = Number(paidRows[0].cents);
  const paidOrders = Number(paidRows[0].n);

  return {
    days,
    revenueCents,
    paidOrders,
    avgTicketCents: paidOrders ? Math.round(revenueCents / paidOrders) : 0,
    pendingCents: Number(pendingRows[0].cents),
    pendingOrders: Number(pendingRows[0].n),
    refundedCents: Number(refundedRows[0].cents),
    refundedOrders: Number(refundedRows[0].n),
    topProducts: top.map((t) => ({
      productName: t.productName,
      quantity: Number(t.quantity),
      revenueCents: Number(t.revenueCents),
    })),
  };
}

// Variants at/below the low-stock threshold, with product name — used by both
// the dashboard alert and the daily email.
export async function getLowStockVariants(threshold: number) {
  return db
    .select({
      productName: products.name,
      slug: products.slug,
      size: productVariants.size,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .innerJoin(products, sql`${products.id} = ${productVariants.productId}`)
    .where(sql`${productVariants.stock} <= ${threshold}`)
    .orderBy(productVariants.stock);
}
