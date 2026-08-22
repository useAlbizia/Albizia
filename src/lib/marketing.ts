import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { subscribers, campaigns } from "./db/schema";

export async function getMarketingOverview() {
  const [activeRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(subscribers)
    .where(eq(subscribers.status, "active"));
  const [totalRow] = await db.select({ n: sql<number>`count(*)::int` }).from(subscribers);

  const recentSubs = await db.query.subscribers.findMany({
    orderBy: desc(subscribers.createdAt),
    limit: 10,
  });

  const recentCampaigns = await db.query.campaigns.findMany({
    orderBy: desc(campaigns.createdAt),
    limit: 10,
  });

  return {
    active: activeRow?.n ?? 0,
    total: totalRow?.n ?? 0,
    recentSubs,
    recentCampaigns,
  };
}
