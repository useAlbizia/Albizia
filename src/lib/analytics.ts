import "server-only";
import { and, gte, eq, sql, desc, isNotNull } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "./db/client";
import { analyticsEvents as ev } from "./db/schema";

export type Bucket = { label: string; n: number };

export type AnalyticsSummary = {
  days: number;
  pageViews: number;
  uniqueVisitors: number;
  returningVisitors: number;
  sessions: number;
  productViews: number;
  addToCart: number;
  checkoutStart: number;
  ordersCreated: number;
  ordersPaid: number;
  revenueCents: number;
  devices: { mobile: number; tablet: number; desktop: number };
  browsers: Bucket[];
  os: Bucket[];
  cities: Bucket[];
  referrers: Bucket[];
  topPages: Bucket[];
  topViewed: { slug: string; count: number }[];
  daily: { date: string; views: number }[];
  hourly: { hour: number; n: number }[];
};

export async function getAnalyticsSummary(days = 30): Promise<AnalyticsSummary> {
  const since = new Date(Date.now() - days * 864e5);
  const scope = gte(ev.createdAt, since);

  const countOf = async (type: string) => {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(ev)
      .where(and(scope, eq(ev.type, type)));
    return r?.n ?? 0;
  };

  // Distinct visitors grouped by a text column (top N), ignoring nulls.
  const visitorsBy = async (col: AnyPgColumn, limit = 8): Promise<Bucket[]> => {
    const rows = await db
      .select({ label: col, n: sql<number>`count(distinct ${ev.visitorId})::int` })
      .from(ev)
      .where(and(scope, isNotNull(col), isNotNull(ev.visitorId)))
      .groupBy(col)
      .orderBy(desc(sql`count(distinct ${ev.visitorId})`))
      .limit(limit);
    return rows.map((r) => ({ label: r.label ?? "—", n: r.n }));
  };

  const [
    pageViews,
    productViews,
    addToCart,
    checkoutStart,
    ordersCreated,
    ordersPaid,
    [visitorsRow],
    [returningRow],
    [sessionsRow],
    [revenueRow],
    deviceRows,
    browsers,
    os,
    referrers,
    topViewedRows,
    topPageRows,
    cityRows,
    hourlyRows,
    dailyRows,
  ] = await Promise.all([
    countOf("page_view"),
    countOf("product_view"),
    countOf("add_to_cart"),
    countOf("checkout_start"),
    countOf("order_created"),
    countOf("order_paid"),
    db.select({ n: sql<number>`count(distinct ${ev.visitorId})::int` }).from(ev).where(and(scope, isNotNull(ev.visitorId))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(
        db
          .select({ v: ev.visitorId })
          .from(ev)
          .where(and(scope, isNotNull(ev.visitorId)))
          .groupBy(ev.visitorId)
          .having(sql`count(distinct ${ev.sessionId}) > 1`)
          .as("multi")
      ),
    db.select({ n: sql<number>`count(distinct ${ev.sessionId})::int` }).from(ev).where(and(scope, isNotNull(ev.sessionId))),
    db.select({ v: sql<number>`coalesce(sum(${ev.valueCents}),0)::int` }).from(ev).where(and(scope, eq(ev.type, "order_paid"))),
    db.select({ device: ev.device, n: sql<number>`count(distinct ${ev.visitorId})::int` }).from(ev).where(and(scope, isNotNull(ev.visitorId))).groupBy(ev.device),
    visitorsBy(ev.browser),
    visitorsBy(ev.os),
    visitorsBy(ev.referrer, 8),
    db.select({ slug: ev.productSlug, count: sql<number>`count(*)::int` }).from(ev).where(and(scope, eq(ev.type, "product_view"), isNotNull(ev.productSlug))).groupBy(ev.productSlug).orderBy(desc(sql`count(*)`)).limit(6),
    db.select({ label: ev.path, n: sql<number>`count(*)::int` }).from(ev).where(and(scope, eq(ev.type, "page_view"), isNotNull(ev.path))).groupBy(ev.path).orderBy(desc(sql`count(*)`)).limit(8),
    db
      .select({ label: sql<string>`coalesce(${ev.city},'') || case when ${ev.region} is not null then ', ' || ${ev.region} else '' end`, n: sql<number>`count(distinct ${ev.visitorId})::int` })
      .from(ev)
      .where(and(scope, isNotNull(ev.city), isNotNull(ev.visitorId)))
      .groupBy(ev.city, ev.region)
      .orderBy(desc(sql`count(distinct ${ev.visitorId})`))
      .limit(8),
    db.select({ hour: sql<number>`extract(hour from ${ev.createdAt} at time zone 'America/Sao_Paulo')::int`, n: sql<number>`count(*)::int` }).from(ev).where(and(scope, eq(ev.type, "page_view"))).groupBy(sql`extract(hour from ${ev.createdAt} at time zone 'America/Sao_Paulo')`),
    db.select({ date: sql<string>`to_char(${ev.createdAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`, views: sql<number>`count(*)::int` }).from(ev).where(and(gte(ev.createdAt, new Date(Date.now() - 14 * 864e5)), eq(ev.type, "page_view"))).groupBy(sql`to_char(${ev.createdAt} at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')`),
  ]);

  const devices = { mobile: 0, tablet: 0, desktop: 0 };
  for (const r of deviceRows) {
    if (r.device === "mobile" || r.device === "tablet" || r.device === "desktop") devices[r.device] = r.n;
  }

  const dailyMap = new Map(dailyRows.map((r) => [r.date, r.views]));
  const daily: { date: string; views: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    daily.push({ date: d, views: dailyMap.get(d) ?? 0 });
  }

  const hourMap = new Map(hourlyRows.map((r) => [r.hour, r.n]));
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, n: hourMap.get(h) ?? 0 }));

  return {
    days,
    pageViews,
    uniqueVisitors: visitorsRow?.n ?? 0,
    returningVisitors: returningRow?.n ?? 0,
    sessions: sessionsRow?.n ?? 0,
    productViews,
    addToCart,
    checkoutStart,
    ordersCreated,
    ordersPaid,
    revenueCents: revenueRow?.v ?? 0,
    devices,
    browsers,
    os,
    cities: cityRows.map((r) => ({ label: r.label || "—", n: r.n })),
    referrers: referrers.length ? referrers : [{ label: "Direto / sem origem", n: 0 }],
    topPages: topPageRows.map((r) => ({ label: r.label ?? "—", n: r.n })),
    topViewed: topViewedRows.filter((t): t is { slug: string; count: number } => !!t.slug),
    daily,
    hourly,
  };
}

export type RecentEvent = {
  createdAt: Date;
  type: string;
  path: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  city: string | null;
  region: string | null;
  referrer: string | null;
  visitor: string | null;
};

// A raw feed of the most recent visits — the "forensic" view that lets the
// founders inspect actual events and confirm the numbers are real.
export async function getRecentEvents(limit = 60): Promise<RecentEvent[]> {
  const rows = await db.query.analyticsEvents.findMany({
    orderBy: [desc(ev.createdAt)],
    limit,
  });
  return rows.map((r) => ({
    createdAt: r.createdAt,
    type: r.type,
    path: r.path,
    device: r.device,
    browser: r.browser,
    os: r.os,
    city: r.city,
    region: r.region,
    referrer: r.referrer,
    visitor: r.visitorId ? r.visitorId.slice(0, 8) : null,
  }));
}
