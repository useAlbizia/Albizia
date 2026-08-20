import { getCollections } from "@/lib/products";
import { NewProductForm } from "./NewProductForm";

export default async function NovoProdutoPage() {
  const collections = await getCollections();

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Novo produto</h1>
      <NewProductForm collections={collections} />
    </div>
  );
}
