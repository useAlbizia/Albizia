import { Symbol } from "@/components/logo/Symbol";

export const metadata = { title: "Sobre — ALBIZIA" };

export default function SobrePage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-28 text-center">
      <Symbol className="h-10 w-10 opacity-70" />
      <p className="mt-10 text-lg leading-relaxed text-content/80">
        ALBIZIA nasce da união de dois nomes e de uma ideia simples: a força
        verdadeira está na inteligência de saber pausar.
      </p>
      <p className="mt-6 text-sm leading-relaxed text-content/60">
        Trabalhamos com algodões selecionados e modelagens estudadas, com um
        único objetivo — peças que envelhecem bem e dizem pouco por si
        mesmas.
      </p>
    </section>
  );
}
