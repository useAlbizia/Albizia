import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Security headers applied to every response. These are the ones that are safe
// to enable without breaking the payment flow. A strict Content-Security-Policy
// is deliberately NOT set here: the Mercado Pago Brick and Google Identity load
// third-party scripts and iframes, and a CSP typo would silently break checkout,
// which is worse than not having one. That needs its own tested pass.
const securityHeaders = [
  // Force HTTPS for a year, including subdomains. No "preload" on purpose:
  // preloading is submitted to a browser list and is painful to undo.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Stops the browser from second-guessing a declared content type, which is
  // how an uploaded "image" gets executed as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: nobody embeds our checkout in their own page and overlays it.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  // Do not leak the full URL (which can carry an order id) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // We never use these, so no script on the page may ask for them.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/product-images/**`)]
      : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
