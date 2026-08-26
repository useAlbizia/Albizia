"use client";

// Anonymous, cookie-light visitor tracking (no personal data).
// - visitorId: persistent (localStorage) → the same person across visits,
//   so we can count UNIQUE and RETURNING visitors.
// - sessionId: per-visit (sessionStorage) → resets when the tab/browser
//   closes, so we can count SESSIONS (individual visits).
// Bot filtering and device detection happen server-side (see /api/track).

const VISITOR_KEY = "albizia-vid";
const SESSION_KEY = "albizia-ses";

function ids(): { visitorId: string; sessionId: string } {
  if (typeof window === "undefined") return { visitorId: "", sessionId: "" };
  try {
    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return { visitorId, sessionId };
  } catch {
    return { visitorId: "", sessionId: "" };
  }
}

type TrackPayload = {
  type: "page_view" | "product_view" | "add_to_cart" | "checkout_start";
  path?: string;
  productSlug?: string;
};

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ ...payload, ...ids() });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", body, keepalive: true });
    }
  } catch {
    // tracking must never break the page
  }
}
