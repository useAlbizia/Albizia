import { Symbol } from "@/components/logo/Symbol";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

// The recovery email links here with a `code`. We exchange it for a session
// (server-side) so the visitor is authenticated just long enough to set a
// new password. If the code is missing/expired, we say so plainly.
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

      {ok ? (
        <SetPasswordForm />
      ) : (
        <p className="mt-8 max-w-xs text-center text-sm leading-relaxed text-content/60">
          Este link é inválido ou expirou. Solicite um novo em{" "}
          <a href="/admin/esqueci" className="underline">
            recuperar acesso
          </a>
          .
        </p>
      )}
    </div>
  );
}
