import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/site-url";

export const dynamic = "force-dynamic";

// Destino do botão "Confirmar meu e-mail" do cadastro de cliente.
//
// Confere o código aqui, no servidor, numa rota (rota pode gravar cookie;
// página não pode, e era isso que fazia a troca de senha dar "link
// expirado"). Se der certo, a pessoa já sai logada na conta.
//
// Só os tipos de confirmação de e-mail são aceitos: uma rota que aceitasse
// "recovery" deixaria logar com link de troca de senha por um caminho que
// não pede a senha nova.
const TIPOS_ACEITOS = new Set<EmailOtpType>(["signup", "email"]);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const next = destinoSeguro(searchParams.get("next"), "/conta");

  if (tokenHash && tipo && TIPOS_ACEITOS.has(tipo)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/conta?erro=confirmacao`);
}
