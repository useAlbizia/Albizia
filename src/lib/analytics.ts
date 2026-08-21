import "server-only";
import { and, gte, eq, sql, desc, isNotNull } from "drizzle-orm";
import { db } from "./db/client";
import { analyticsEvents } from "./db/schema";

export type AnalyticsSummary = {
  days: number;
  pageViews: number;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStart: number;
  ordersCreated: number;
  ordersPaid: number;
  revenueCents: number;
  topViewed: { slug: string; count: number }[];
  daily: { date: string; views: number }[];
};

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const scope = gte(analyticsEvents.createdAt, since);

  const countOf = async (type: string) => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(and(scope, eq(analyticsEvents.type, type)));
    return row?.n ?? 0;
  };

  const [
    pageViews,
    productViews,
    addToCart,
    checkoutStart,
    ordersCreated,
    ordersPaid,
  ] = await Promise.all([
    countOf("page_view"),
    countOf("product_view"),
    countOf("add_to_cart"),
    countOf("checkout_start"),
    countOf("order_created"),
    countOf("order_paid"),
  ]);

  const [sessionsRow] = await db
    .select({ n: sql<number>`count(distinct ${analyticsEvents.sessionId})::int` })
    .from(analyticsEvents)
    .where(and(scope, isNotNull(analyticsEvents.sessionId)));

  const [revenueRow] = await db
    .select({ v: sql<number>`coalesce(sum(${analyticsEvents.valueCents}),0)::int` })
    .from(analyticsEvents)
    .where(and(scope, eq(analyticsEvents.type, "order_paid")));

  const topViewed = await db
    .select({ slug: analyticsEvents.productSlug, count: sql<number>`count(*)::int` })
    .from(analyticsEvents)
    .where(and(scope, eq(analyticsEvents.type, "product_view"), isNotNull(analyticsEvents.productSlug)))
    .groupBy(analyticsEvents.productSlug)
    .orderBy(desc(sql`count(*)`))
    .limit(6);

  const dailyRows = await db
    .select({
      date: sql<string>`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`,
      views: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(and(gte(analyticsEvents.createdAt, new Date(Date.now() - 14 * 864e5)), eq(analyticsEvents.type, "page_view")))
    .groupBy(sql`to_char(${analyticsEvents.createdAt}, 'YYYY-MM-DD')`);

  // fill the last 14 days so the chart has no gaps
  const dailyMap = new Map(dailyRows.map((r) => [r.date, r.views]));
  const daily: { date: string; views: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    daily.push({ date: d, views: dailyMap.get(d) ?? 0 });
  }

  return {
    days,
    pageViews,
    sessions: sessionsRow?.n ?? 0,
    productViews,
    addToCart,
    checkoutStart,
    ordersCreated,
    ordersPaid,
    revenueCents: revenueRow?.v ?? 0,
    topViewed: topViewed
      .filter((t): t is { slug: string; count: number } => !!t.slug)
      .map((t) => ({ slug: t.slug, count: t.count })),
    daily,
  };
}
