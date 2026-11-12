import { notFound } from "next/navigation";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { getCollections } from "@/lib/products";
import { fichaDoProduto, listarInsumos } from "@/lib/ficha";
import { EditProductForm } from "./EditProductForm";
import { VariantsEditor } from "./VariantsEditor";
import { ImageUploader } from "./ImageUploader";
import { FichaEditor } from "./FichaEditor";
import { EscolherGuia } from "./EscolherGuia";
import { guiaIdDoProduto, listarGuias } from "@/lib/guias";

export default async function EditProdutoPage(props: PageProps<"/admin/produtos/[id]">) {
  const { id } = await props.params;

  const [product, collections, ficha, insumos, outros, guias, guiaAtual] = await Promise.all([
    db.query.products.findFirst({
      where: eq(products.id, id),
      with: { collection: true, variants: true, images: true },
    }),
    getCollections(),
    fichaDoProduto(id),
    listarInsumos(),
    db.select({ id: products.id, nome: products.name }).from(products).where(ne(products.id, id)).orderBy(asc(products.name)),
    listarGuias(),
    guiaIdDoProduto(id),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">{product.name}</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <EditProductForm product={product} collections={collections} temFicha={ficha.length > 0} />

        <div className="flex flex-col gap-10">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Ficha técnica</p>
            <FichaEditor
              productId={product.id}
              linhas={ficha.map((l) => ({ id: l.id, quantidadeMil: l.quantidadeMil, insumo: l.insumo }))}
              insumos={insumos.filter((i) => i.ativo)}
              outrosProdutos={outros}
            />
          </div>

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">
              Estoque por tamanho
            </p>
            <VariantsEditor productId={product.id} variants={product.variants} />
          </div>

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Guia de tamanhos</p>
            <EscolherGuia
              productId={product.id}
              atual={guiaAtual}
              guias={guias.map((g) => ({ id: g.id, nome: g.nome }))}
              temCores={!!product.colorGroup}
            />
          </div>

          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">Fotos</p>
            <ImageUploader productId={product.id} slug={product.slug} images={product.images} />
          </div>
        </div>
      </div>
    </div>
  );
}
