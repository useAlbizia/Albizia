import { Symbol } from "@/components/logo/Symbol";
import { DescadastrarForm } from "./DescadastrarForm";

export const metadata = { title: "Cancelar inscrição — ALBIZIA" };

export default async function DescadastrarPage(props: PageProps<"/descadastrar">) {
  const sp = await props.searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <Symbol className="h-10 w-10 opacity-70" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Newsletter</h1>
      <DescadastrarForm email={email} />
    </section>
  );
}
