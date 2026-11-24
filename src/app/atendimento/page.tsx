import Link from "next/link";
import { FormAtendimento } from "@/components/FormAtendimento";

export const metadata = {
  title: "Atendimento · ALBIZIA",
  description: "Abra um protocolo de atendimento: problema com a peça, troca, entrega ou pagamento.",
};

export default function AtendimentoPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="mb-4 text-center text-sm uppercase tracking-[0.3em] text-content/60">Atendimento</h1>
      <p className="mx-auto mb-12 max-w-lg text-center text-sm leading-relaxed text-content/70">
        Conte o que aconteceu e abrimos um protocolo para o seu caso. Você recebe o número e o prazo de resposta por
        e-mail, e nossa equipe responde por lá. Para saber onde está o seu pedido, use{" "}
        <Link href="/acompanhar" className="underline underline-offset-2">
          Acompanhar pedido
        </Link>
        ; para trocas, veja também a{" "}
        <Link href="/trocas" className="underline underline-offset-2">
          política de trocas
        </Link>
        .
      </p>
      <FormAtendimento />
    </section>
  );
}
