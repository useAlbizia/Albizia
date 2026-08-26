import "server-only";
import { asc } from "drizzle-orm";
import { db } from "./db/client";
import { menuItems } from "./db/schema";

export type MenuLink = { label: string; href: string };
export type MenuColumn = { title: string; links: MenuLink[] };
export type MenuEntry = {
  id: string;
  label: string;
  href: string | null;
  featured: { img: string; href: string; label: string } | null;
  columns: MenuColumn[];
};

// The storefront navigation, built from the DB (admin-editable). Links are
// grouped into columns by columnTitle, order preserved. Serializable — passed
// from the root layout down to the client Header.
export async function getMenu(): Promise<MenuEntry[]> {
  const rows = await db.query.menuItems.findMany({
    where: (m, { eq }) => eq(m.active, true),
    orderBy: [asc(menuItems.sortOrder)],
    with: { links: { orderBy: (l, { asc: a }) => [a(l.sortOrder)] } },
  });

  return rows.map((item) => {
    const columns: MenuColumn[] = [];
    for (const l of item.links) {
      let col = columns.find((c) => c.title === l.columnTitle);
      if (!col) {
        col = { title: l.columnTitle, links: [] };
        columns.push(col);
      }
      col.links.push({ label: l.label, href: l.href });
    }
    return {
      id: item.id,
      label: item.label,
      href: item.href,
      featured:
        item.featuredImageUrl && item.featuredHref
          ? { img: item.featuredImageUrl, href: item.featuredHref, label: item.featuredLabel ?? "" }
          : null,
      columns,
    };
  });
}
