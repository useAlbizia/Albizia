import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// OAuth (Google) redirect target: exchanges the one-time code for a session
// cookie, then sends the customer to their account. Also handles the Supabase
// email-confirmation link, which lands here with a code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Sem conferir, ?next=@site-falso.com mandaria a pessoa para fora do site.
  const next = destinoSeguro(searchParams.get("next"), "/conta");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/conta?erro=auth`);
}
