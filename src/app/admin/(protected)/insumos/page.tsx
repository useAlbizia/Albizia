import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { fichaTecnica } from "@/lib/db/schema";
import { listarInsumos } from "@/lib/ficha";
import { TIPOS_INSUMO } from "@/lib/ficha-calc";
import { InsumoForm } from "./InsumoForm";

export const dynamic = "force-dynamic";

// Valor e quantidade como a pessoa digitaria, para o formulário de edição.
const reaisTexto = (c: number) => (c / 100).toFixed(2).replace(".", ",");
const qtdTexto = (mil: number) => (mil % 1000 === 0 ? String(mil / 1000) : (mil / 1000).toString().replace(".", ","));

export default async function InsumosPage() {
  const [lista, usos] = await Promise.all([
    listarInsumos(),
    db
      .select({ insumoId: fichaTecnica.insumoId, n: sql<number>`count(distinct ${fichaTecnica.productId})::int` })
      .from(fichaTecnica)
      .groupBy(fichaTecnica.insumoId),
  ]);
  const usosDe = (id: string) => usos.find((u) => u.insumoId === id)?.n ?? 0;

  return (
    <div className="flex max-w-4xl flex-col gap-10">
      <div>
        <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Insumos</h1>
        <p className="max-w-2xl text-[12px] leading-relaxed text-content/45">
          Tudo que se compra para fazer as peças. Digite o que pagou pelo lote e quantos vieram: o
          sistema faz a conta do custo de cada unidade sem arredondar, então uma etiqueta de 3,5
          centavos fica 3,5 centavos. Quando o fornecedor mudar o preço, atualize aqui e o custo de
          todo modelo que usa o insumo muda junto. Vendas antigas não mudam.
        </p>
      </div>

      <section data-tour="insumo-novo">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/60">Novo insumo</p>
        <InsumoForm />
      </section>

      {TIPOS_INSUMO.map((t) => {
        const doTipo = lista.filter((i) => i.tipo === t.v);
        if (doTipo.length === 0) return null;
        return (
          <section key={t.v}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">{t.nome}</p>
            {t.dica && <p className="mb-3 mt-1 text-[11px] text-content/40">{t.dica}</p>}
            <div className="flex flex-col gap-2">
              {doTipo.map((i) => (
                <InsumoForm
                  key={i.id}
                  insumo={{
                    id: i.id,
                    nome: i.nome,
                    tipo: i.tipo,
                    unidade: i.unidade,
                    loteValor: reaisTexto(i.loteValorCents),
                    loteQuantidade: qtdTexto(i.loteQuantidadeMil),
                    fornecedor: i.fornecedor,
                    ativo: i.ativo,
                    usos: usosDe(i.id),
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}

      {lista.length === 0 && (
        <p className="text-sm text-content/50">
          Nenhum insumo ainda. Comece pela peça lisa: por exemplo, "Peruana manga over lisa", o que
          pagou pelo lote e quantas vieram.
        </p>
      )}
    </div>
  );
}
