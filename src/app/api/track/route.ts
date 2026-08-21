import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CLIENT_TYPES = new Set(["page_view", "product_view", "add_to_cart", "checkout_start"]);

// Public endpoint: the browser posts anonymous visitor events here. Only the
// client-safe event types are accepted (order events are written server-side,
// never trusted from the client). Fields are bounded and never throw.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = String(body.type ?? "");
    if (!CLIENT_TYPES.has(type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await db.insert(analyticsEvents).values({
      type,
      path: body.path ? String(body.path).slice(0, 300) : null,
      productSlug: body.productSlug ? String(body.productSlug).slice(0, 160) : null,
      sessionId: body.sessionId ? String(body.sessionId).slice(0, 60) : null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
