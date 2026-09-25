"use server";

import { getFeaturedProducts, getProductsBySlugs, type Product } from "./products";

// "Compre junto": sugere uma peça para somar ao que já está no carrinho.
//
// A regra é determinística e fácil de explicar, que é o que importa numa
// vitrine: prioriza a mesma linha do que a pessoa já escolheu (quem levou
// Essential tende a levar Essential), remove o que ela já tem, ignora peça
// sem estoque (sugerir esgotado é pior que não sugerir nada) e entre os que
// sobram escolhe o mais barato, que é o acréscimo mais fácil de aceitar.
export async function getCrossSell(slugsInCart: string[]): Promise<Product | null> {
  if (slugsInCart.length === 0) return null;

  const [inCart, catalogo] = await Promise.all([
    getProductsBySlugs(slugsInCart),
    getFeaturedProducts(60),
  ]);

  const linhasNoCarrinho = new Set(inCart.map((p) => p.line));
  const jaTem = new Set(slugsInCart);

  const candidatos = catalogo.filter(
    (p) => !jaTem.has(p.slug) && p.variants.some((v) => v.stock > 0),
  );
  if (candidatos.length === 0) return null;

  const mesmaLinha = candidatos.filter((p) => linhasNoCarrinho.has(p.line));
  const pool = mesmaLinha.length > 0 ? mesmaLinha : candidatos;

  return [...pool].sort((a, b) => a.price - b.price)[0] ?? null;
}
