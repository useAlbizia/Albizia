import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata = { title: "Nova senha · ALBIZIA" };

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

      {ok ? (
        <SetPasswordForm />
      ) : (
        <p className="text-center text-sm leading-relaxed text-content/60">
          Este link é inválido ou expirou.{" "}
          <a href="/conta" className="underline underline-offset-2 hover:text-content">
            Solicite um novo
          </a>
          .
        </p>
      )}
    </section>
  );
}
