import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db/client";
import { analyticsEvents } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CLIENT_TYPES = new Set(["page_view", "product_view", "add_to_cart", "checkout_start"]);

const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|yandex|baidu|duckduck|facebookexternalhit|embedly|quora|pinterest|slackbot|telegram|whatsapp|discord|twitter|linkedin|preview|scan|monitor|headless|phantom|puppeteer|playwright|selenium|python-requests|python-httpx|curl\/|wget|axios|node-fetch|go-http|java\/|okhttp|lighthouse|gtmetrix|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|applebot|amazonbot|gptbot|claudebot|ccbot|perplexity|archive\.org|feedfetcher|vercel|render|datadog|newrelic/i;

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Outro";
}

function detectOS(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Outro";
}

function refHost(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  try {
    return new URL(s).hostname.replace(/^www\./, "").slice(0, 120) || null;
  } catch {
    return null;
  }
}

// Public endpoint: anonymous visitor events. Bots, tools and localhost/dev
// traffic are dropped so the data stays real. Captures device, browser, OS,
// coarse geo (Vercel edge headers) and referrer host — never the raw IP.
export async function POST(request: NextRequest) {
  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT_RE.test(ua)) return NextResponse.json({ ok: true, skipped: "bot" });

    const host = request.headers.get("host") ?? request.nextUrl.hostname;
    if (/^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)/i.test(host)) {
      return NextResponse.json({ ok: true, skipped: "dev" });
    }

    const body = await request.json().catch(() => ({}));
    const type = String(body.type ?? "");
    if (!CLIENT_TYPES.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

    const h = request.headers;
    const decode = (v: string | null) => (v ? decodeURIComponent(v).slice(0, 80) : null);

    await db.insert(analyticsEvents).values({
      type,
      path: body.path ? String(body.path).slice(0, 300) : null,
      productSlug: body.productSlug ? String(body.productSlug).slice(0, 160) : null,
      sessionId: body.sessionId ? String(body.sessionId).slice(0, 60) : null,
      visitorId: body.visitorId ? String(body.visitorId).slice(0, 60) : null,
      device: detectDevice(ua),
      browser: detectBrowser(ua),
      os: detectOS(ua),
      country: decode(h.get("x-vercel-ip-country")),
      region: decode(h.get("x-vercel-ip-country-region")),
      city: decode(h.get("x-vercel-ip-city")),
      referrer: refHost(body.referrer),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
