import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { menuItems } from "@/lib/db/schema";
import { AddItemForm, MenuItemEditor } from "./MenuForms";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const items = await db.query.menuItems.findMany({
    orderBy: [asc(menuItems.sortOrder)],
    with: { links: { orderBy: (l, { asc: a }) => [a(l.sortOrder)] } },
  });

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Menu do site</h1>
      <p className="mb-8 max-w-2xl text-[12px] text-content/40">
        Itens do topo do site. Um item com links vira um mega-menu (colunas de submenu + imagem de
        destaque). Sem links, vira um link simples. A ordem controla a posição no topo.
      </p>

      <div className="mb-10">
        <AddItemForm />
      </div>

      <div className="flex flex-col gap-6">
        {items.map((item) => (
          <MenuItemEditor key={item.id} item={item} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-content/50">Nenhum item de menu ainda.</p>
      )}
    </div>
  );
}
