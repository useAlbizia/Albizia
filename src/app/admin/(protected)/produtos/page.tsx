import Link from "next/link";
import { db } from "@/lib/db/client";

export default async function AdminProdutosPage() {
  const rows = await db.query.products.findMany({
    with: { collection: true, variants: true },
    orderBy: (p, { desc }) => desc(p.createdAt),
  });

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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-content/10 text-[11px] uppercase tracking-[0.1em] text-content/50">
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
              return (
                <tr key={p.id} className="hover:bg-surface-soft">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/produtos/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-content/60">{p.collection.name}</td>
                  <td className="py-3 pr-4 text-content/60">
                    {(p.priceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="py-3 pr-4 text-content/60">
                    {totalStock === 0 ? (
                      <span className="text-content/40">esgotado</span>
                    ) : (
                      totalStock
                    )}
                  </td>
                  <td className="py-3 pr-4 text-content/60">
                    {p.active ? "Ativo" : "Inativo"}
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
