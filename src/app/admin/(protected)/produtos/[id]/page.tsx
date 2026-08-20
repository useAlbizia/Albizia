import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCollections } from "@/lib/products";
import { EditProductForm } from "./EditProductForm";
import { VariantsEditor } from "./VariantsEditor";
import { ImageUploader } from "./ImageUploader";

export default async function EditProdutoPage(props: PageProps<"/admin/produtos/[id]">) {
  const { id } = await props.params;

  const [product, collections] = await Promise.all([
    db.query.products.findFirst({
      where: eq(products.id, id),
      with: { collection: true, variants: true, images: true },
    }),
    getCollections(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">{product.name}</h1>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <EditProductForm product={product} collections={collections} />

        <div className="flex flex-col gap-10">
          <div>
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-content/50">
              Estoque por tamanho
            </p>
            <VariantsEditor productId={product.id} variants={product.variants} />
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
