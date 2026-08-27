import Link from "next/link";
import {
  getFilteredProducts,
  getProductsBySlugs,
  getCollections,
  type ProductFilters,
  type Product,
} from "@/lib/products";
import { aiSearchProducts } from "@/lib/ai";
import { ProductCover } from "@/components/ProductImage";

export const metadata = { title: "Produtos — ALBIZIA" };

const SORTS = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProdutosPage(props: PageProps<"/produtos">) {
  const sp = await props.searchParams;
  const filters: ProductFilters = {
    q: one(sp.q),
    line: one(sp.linha),
    category: one(sp.categoria),
    sort: (one(sp.ordem) as ProductFilters["sort"]) ?? "recentes",
  };

  const collections = await getCollections();

  // Smart search: when there's a query, let the AI rank relevant products
  // (understands intent/occasion/color). Falls back to text match if the AI
  // is unavailable or returns nothing.
  let products: Product[];
  let aiUsed = false;
  const slugs = filters.q?.trim() ? await aiSearchProducts(filters.q) : null;
  if (slugs && slugs.length > 0) {
    products = (await getProductsBySlugs(slugs)).filter(
      (p) =>
        (!filters.line || p.line === filters.line) &&
        (!filters.category || p.category === filters.category)
    );
    aiUsed = true;
  } else {
    products = await getFilteredProducts(filters);
  }

  const selectClass =
    "border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content";

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Produtos
      </h1>

      {/* Search + filters (plain GET form — works without JS) */}
      <form className="mb-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Buscar peças..."
          className={`${selectClass} flex-1 sm:min-w-[220px]`}
        />
        <select name="linha" defaultValue={filters.line ?? ""} className={selectClass}>
          <option value="">Todas as coleções</option>
          {collections.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={filters.category ?? ""} className={selectClass}>
          <option value="">Todas as categorias</option>
          <option value="camiseta">Camiseta</option>
          <option value="moda-praia">Moda Praia</option>
        </select>
        <select name="ordem" defaultValue={filters.sort} className={selectClass}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="border border-content px-6 py-2 text-[13px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          Filtrar
        </button>
      </form>

      {aiUsed && (
        <p className="mb-6 text-center text-[12px] uppercase tracking-[0.15em] text-content/50">
          ✦ Busca inteligente para “{filters.q}”
        </p>
      )}

      {products.length === 0 ? (
        <p className="py-16 text-center text-sm text-content/50">
          Nenhuma peça encontrada. Tente outra busca ou filtro.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {products.map((product) => (
            <Link key={product.slug} href={`/produto/${product.slug}`} className="group block">
              <ProductCover
                name={product.name}
                images={product.images}
                role="studio"
                className="aspect-[4/5] w-full"
              />
              <h2 className="mt-3 text-[13px] uppercase tracking-[0.1em] text-content/80 group-hover:text-content">
                {product.name}
              </h2>
              <p className="mt-1 text-sm text-content/50">
                {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
