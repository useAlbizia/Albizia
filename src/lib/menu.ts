import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "./db/client";
import { collections, menuItems, products } from "./db/schema";

export type MenuLink = { label: string; href: string };
export type MenuColumn = { title: string; links: MenuLink[] };
export type MenuEntry = {
  id: string;
  label: string;
  href: string | null;
  featured: { img: string; href: string; label: string } | null;
  columns: MenuColumn[];
};

/**
 * O que está à venda agora: slugs de produtos ativos e de coleções com pelo
 * menos uma peça ativa. O menu esconde sozinho o resto.
 *
 * POR QUE: o menu tinha links para peças que saíram do catálogo (Studio
 * Oversized, shorts) e coleções vazias. O cliente caía em "não encontrado" e
 * o navegador gerava erro 404 no console a cada página, ao pré-carregar o
 * link. Escondendo (sem apagar), quando a peça volta o link volta junto.
 */
async function vitrine(): Promise<{ produtos: Set<string>; colecoes: Set<string> }> {
  const [ps, cs] = await Promise.all([
    db.select({ slug: products.slug }).from(products).where(eq(products.active, true)),
    db
      .select({ slug: collections.slug })
      .from(collections)
      .where(sql`exists (select 1 from ${products} p where p.collection_id = ${collections.id} and p.active)`),
  ]);
  return { produtos: new Set(ps.map((p) => p.slug)), colecoes: new Set(cs.map((c) => c.slug)) };
}

/** Link que leva a produto desativado ou coleção vazia não aparece. */
export function linkValido(href: string | null | undefined, v: { produtos: Set<string>; colecoes: Set<string> }): boolean {
  if (!href) return true;
  const produto = href.match(/^\/produto\/([^/?#]+)/);
  if (produto) return v.produtos.has(produto[1]);
  const colecao = href.match(/^\/colecoes\/([^/?#]+)/);
  if (colecao) return v.colecoes.has(colecao[1]);
  return true;
}

// The storefront navigation, built from the DB (admin-editable). Links are
// grouped into columns by columnTitle, order preserved. Serializable — passed
// from the root layout down to the client Header.
export async function getMenu(): Promise<MenuEntry[]> {
  const [rows, v] = await Promise.all([
    db.query.menuItems.findMany({
      where: (m, { eq: igual }) => igual(m.active, true),
      orderBy: [asc(menuItems.sortOrder)],
      with: { links: { orderBy: (l, { asc: a }) => [a(l.sortOrder)] } },
    }),
    vitrine().catch(() => null),
  ]);
  const ok = (href: string | null | undefined) => (v ? linkValido(href, v) : true);

  return rows
    .map((item) => {
      const columns: MenuColumn[] = [];
      for (const l of item.links) {
        if (!ok(l.href)) continue;
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
        href: ok(item.href) ? item.href : null,
        featured:
          item.featuredImageUrl && item.featuredHref && ok(item.featuredHref)
            ? { img: item.featuredImageUrl, href: item.featuredHref, label: item.featuredLabel ?? "" }
            : null,
        columns,
      };
    })
    // Item que ficou sem nenhum link e sem destino (ex.: Moda Praia sem
    // shorts à venda) sai do menu inteiro.
    .filter((e) => e.href || e.columns.length > 0 || e.featured);
}
