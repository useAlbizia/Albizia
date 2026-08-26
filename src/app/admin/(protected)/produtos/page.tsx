import Link from "next/link";
import { db } from "@/lib/db/client";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProdutosPage() {
  const rows = await db.query.products.findMany({
    with: {
      collection: true,
      variants: true,
      images: { orderBy: (i, { asc }) => asc(i.sortOrder), limit: 1 },
    },
    orderBy: (p, { desc }) => desc(p.createdAt),
  });

  // Active products with no photo are hidden from the storefront — flag them.
  const noPhoto = rows.filter((p) => p.active && p.images.length === 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="border border-content px-4 py-2 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          Novo produto
        </Link>
      </div>

      {noPhoto.length > 0 && (
        <div className="mb-6 border border-amber-500/40 bg-amber-500/10 p-4 text-[13px] text-amber-700 dark:text-amber-300">
          <strong>{noPhoto.length} produto(s) ativo(s) sem foto</strong> — estão{" "}
          <strong>ocultos no site</strong> até receberem ao menos uma imagem:{" "}
          {noPhoto.map((p) => p.name).join(", ")}. Adicione fotos ou desative-os.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
              <th className="py-3 pr-4 font-normal"></th>
              <th className="py-3 pr-4 font-normal">Nome</th>
              <th className="py-3 pr-4 font-normal">Coleção</th>
              <th className="py-3 pr-4 font-normal">Preço</th>
              <th className="py-3 pr-4 font-normal">Estoque</th>
              <th className="py-3 pr-4 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-content/10">
            {rows.map((p) => {
              const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
              const thumb = p.images[0]?.url;
              return (
                <tr key={p.id} className="hover:bg-surface-soft">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/produtos/${p.id}`} className="block">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, no optimization needed
                        <img
                          src={thumb}
                          alt={p.name}
                          className="h-12 w-12 rounded object-cover ring-1 ring-content/10"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded bg-content/5 text-[9px] uppercase tracking-wider text-content/30 ring-1 ring-content/10">
                          sem foto
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/produtos/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-content/60">{p.collection.name}</td>
                  <td className="py-3 pr-4 text-content/60">{brl(p.priceCents)}</td>
                  <td className="py-3 pr-4 text-content/60">
                    {totalStock === 0 ? (
                      <span className="text-red-600 dark:text-red-400">esgotado</span>
                    ) : totalStock <= 3 ? (
                      <span className="text-amber-600 dark:text-amber-400">{totalStock} (baixo)</span>
                    ) : (
                      totalStock
                    )}
                  </td>
                  <td className="py-3 pr-4 text-content/60">
                    {p.active ? (
                      "Ativo"
                    ) : (
                      <span className="text-content/40">Inativo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="py-10 text-center text-sm text-content/50">
            Nenhum produto cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
