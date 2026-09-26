import { Symbol } from "@/components/logo/Symbol";
import { createClient } from "@/lib/supabase/server";
import { RecoveryGate } from "@/components/auth/RecoveryGate";
import { SetPasswordForm } from "./SetPasswordForm";

// O e-mail de recuperação pode chegar de duas formas, e as duas caem aqui:
//  - `?code=...`  → fluxo PKCE, trocado por sessão aqui no servidor.
//  - `#access_token=...` → o que a API admin gera. A tralha não chega ao
//    servidor, então quem lê é o RecoveryGate, no navegador.
export default async function RedefinirPage(props: PageProps<"/admin/redefinir">) {
  const params = await props.searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;

  let ok = false;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-content">
      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Nova senha</h1>

      <div className="mt-8 w-full max-w-xs">
        <RecoveryGate
          servidorOk={ok}
          linkAjuda={{ href: "/admin/esqueci", texto: "recuperar acesso" }}
        >
          <SetPasswordForm />
        </RecoveryGate>
      </div>
    </div>
  );
}
