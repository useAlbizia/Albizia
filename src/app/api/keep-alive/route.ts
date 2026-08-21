import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

// Hit daily by a Vercel Cron (see vercel.json). A trivial query keeps the
// Supabase free-tier project from pausing after 7 days of inactivity —
// static storefront pages don't touch the DB on their own, so without this
// a quiet week could put the database to sleep and break the site.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, at: new Date().toISOString() });
  } catch (err) {
    console.error("keep-alive failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
