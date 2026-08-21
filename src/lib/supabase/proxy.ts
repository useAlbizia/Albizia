import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Called from src/proxy.ts on every /admin/* request. Two jobs at once:
// refreshes the Supabase session cookie (getUser() has this side effect,
// which is why we call it here and not just read the cookie), and redirects
// to /admin/login when there's no valid session. This is the "optimistic"
// layer — the real, non-bypassable check is requireAdmin() in
// src/lib/auth/dal.ts, called again inside every admin page and action.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // Public admin auth pages: login + the password-recovery flow. The reset
  // pages MUST stay reachable while logged out (that's the whole point).
  const PUBLIC = ["/admin/login", "/admin/esqueci", "/admin/redefinir"];
  const isPublic = PUBLIC.includes(pathname);

  if (!user && pathname.startsWith("/admin") && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return response;
}
