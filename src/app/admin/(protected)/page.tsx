import { db } from "@/lib/db/client";
import { products, orders, productVariants } from "@/lib/db/schema";
import { count, lte } from "drizzle-orm";

export default async function AdminDashboardPage() {
  const [[productCount], [orderCount], lowStock] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(orders),
    db
      .select({ size: productVariants.size, stock: productVariants.stock })
      .from(productVariants)
      .where(lte(productVariants.stock, 0)),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-sm uppercase tracking-[0.3em] text-content/60">Painel</h1>

      <div className="grid grid-cols-2 gap-px overflow-hidden bg-content/10 sm:grid-cols-3">
        <div className="bg-surface p-6">
          <p className="text-2xl">{productCount.n}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">Produtos</p>
        </div>
        <div className="bg-surface p-6">
          <p className="text-2xl">{orderCount.n}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">Pedidos</p>
        </div>
        <div className="bg-surface p-6">
          <p className="text-2xl">{lowStock.length}</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.15em] text-content/50">
            Tamanhos sem estoque
          </p>
        </div>
      </div>

      {productCount.n === 0 && (
        <p className="mt-10 text-sm text-content/50">
          Nenhum produto ainda — o cadastro de produtos entra na próxima etapa.
        </p>
      )}
    </div>
  );
}
