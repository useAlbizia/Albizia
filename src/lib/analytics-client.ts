"use client";

// Anonymous, cookie-light visitor tracking. A random session id lives in
// localStorage (no personal data). Events are sent with sendBeacon when
// available so they don't delay navigation, falling back to fetch.

const SESSION_KEY = "albizia-sid";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

type TrackPayload = {
  type: "page_view" | "product_view" | "add_to_cart" | "checkout_start";
  path?: string;
  productSlug?: string;
};

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ ...payload, sessionId: sessionId() });
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
