import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./db/client";
import { fichaTecnica, insumos, products } from "./db/schema";
import { custoDaFicha, type LinhaFicha } from "./ficha-calc";

// Leitura e recálculo da ficha técnica. A conta mora em ficha-calc.ts.
//
// REGRA: o custo do produto (products.custoCents) é DERIVADO da ficha quando
// ela existe. Ele é guardado para o checkout copiar no dia da venda, mas
// sempre recalculado aqui quando a ficha ou um insumo muda. Produto sem ficha
// continua com o custo digitado à mão.

export async function listarInsumos() {
  return db.select().from(insumos).orderBy(asc(insumos.tipo), asc(insumos.nome));
}

export async function fichaDoProduto(productId: string) {
  return db.query.fichaTecnica.findMany({
    where: eq(fichaTecnica.productId, productId),
    with: { insumo: true },
  });
}

/** Recalcula e grava o custo de um produto pela ficha. Devolve o custo, ou null sem ficha. */
export async function recalcularCustoProduto(productId: string): Promise<number | null> {
  const linhas = await fichaDoProduto(productId);
  if (linhas.length === 0) return null;
  const custo = custoDaFicha(
    linhas.map<LinhaFicha>((l) => ({
      loteValorCents: l.insumo.loteValorCents,
      loteQuantidadeMil: l.insumo.loteQuantidadeMil,
      quantidadeMil: l.quantidadeMil,
    })),
  );
  await db.update(products).set({ custoCents: custo, updatedAt: new Date() }).where(eq(products.id, productId));
  return custo;
}

/** Quando o preço de um insumo muda, todo produto que o usa muda junto. */
export async function recalcularProdutosDoInsumo(insumoId: string): Promise<number> {
  const usos = await db
    .selectDistinct({ productId: fichaTecnica.productId })
    .from(fichaTecnica)
    .where(eq(fichaTecnica.insumoId, insumoId));
  for (const u of usos) await recalcularCustoProduto(u.productId);
  return usos.length;
}

/**
 * Custo do envelope de um pedido: um de cada insumo ativo do tipo
 * "embalagem do pedido". Arredonda uma vez, no total.
 */
export async function custoEmbalagemPedidoCents(): Promise<number> {
  const rows = await db
    .select()
    .from(insumos)
    .where(and(eq(insumos.tipo, "embalagem_pedido"), eq(insumos.ativo, true)));
  return custoDaFicha(
    rows.map((r) => ({ loteValorCents: r.loteValorCents, loteQuantidadeMil: r.loteQuantidadeMil, quantidadeMil: 1000 })),
  );
}
