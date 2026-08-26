import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CLIENT_TYPES = new Set(["page_view", "product_view", "add_to_cart", "checkout_start"]);

// Anything that isn't a genuine human browser. Kept broad on purpose — the goal
// is analytics you can trust, so we'd rather drop a borderline hit than inflate
// the numbers with crawlers, scanners, link-preview fetchers and headless tools.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|embedly|quora|pinterest|slackbot|telegram|whatsapp|discord|twitter|linkedin|preview|scan|monitor|headless|phantom|puppeteer|playwright|selenium|python-requests|curl\/|wget|axios|node-fetch|go-http|java\/|okhttp|lighthouse|gtmetrix|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|applebot|amazonbot|gptbot|claudebot|ccbot|perplexity/i;

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

// Public endpoint: the browser posts anonymous visitor events here. Only the
// client-safe event types are accepted (order events are written server-side).
// Bots, tools and localhost/dev traffic are dropped so the data stays real.
export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") ?? "";

    // Drop bots/tools and requests without a real browser UA.
    if (!ua || BOT_RE.test(ua)) {
      return NextResponse.json({ ok: true, skipped: "bot" });
    }

    // Drop development traffic (localhost) so testing never pollutes the data.
    const host = request.headers.get("host") ?? request.nextUrl.hostname;
    if (/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)/i.test(host)) {
      return NextResponse.json({ ok: true, skipped: "dev" });
    }

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
      visitorId: body.visitorId ? String(body.visitorId).slice(0, 60) : null,
      device: detectDevice(ua),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
