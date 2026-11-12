import { listarGuias } from "@/lib/guias";
import { EditorGuia } from "./EditorGuia";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guias de tamanho · Painel ALBIZIA" };

export default async function GuiasPage() {
  const guias = await listarGuias();
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Guias de tamanho</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          A tabela de medidas que o cliente vê no botão Guia de tamanhos, na página do produto. Crie um guia por
          modelo (a Peruana tem um caimento, a Regata outro) e depois escolha o guia no produto: dá para aplicar a
          todas as cores de uma vez. Produto sem guia mostra a tabela padrão.
        </p>
      </div>
      {guias.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">{g.nome}</p>
          <EditorGuia {...g} />
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">Novo guia</p>
        <EditorGuia />
      </section>
    </div>
  );
}
