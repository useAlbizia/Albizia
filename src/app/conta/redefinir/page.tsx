import { createClient } from "@/lib/supabase/server";
import { RecoveryGate } from "@/components/auth/RecoveryGate";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata = { title: "Nova senha · ALBIZIA" };

// Mesmos dois formatos de link do painel: `?code=` é trocado aqui no
// servidor, `#access_token=` só existe no navegador e quem lê é o
// RecoveryGate.
export default async function RedefinirContaPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const code = typeof params.code === "string" ? params.code : undefined;

  let ok = false;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  return (
    <section className="mx-auto max-w-sm px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Nova senha
      </h1>

      <RecoveryGate servidorOk={ok} linkAjuda={{ href: "/conta", texto: "minha conta" }}>
        <SetPasswordForm />
      </RecoveryGate>
    </section>
  );
}
