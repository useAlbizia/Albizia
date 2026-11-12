import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { guiasTamanho, produtoGuia } from "@/lib/db/schema";

export type Guia = { id: string; nome: string; colunas: string[]; linhas: string[][]; observacao: string };

export async function listarGuias(): Promise<Guia[]> {
  try {
    return await db.select().from(guiasTamanho).orderBy(asc(guiasTamanho.nome));
  } catch {
    return [];
  }
}

/** O guia de um produto, ou null (a loja mostra o guia padrão). Nunca falha. */
export async function guiaDoProduto(productId: string): Promise<Guia | null> {
  try {
    const [r] = await db
      .select({ g: guiasTamanho })
      .from(produtoGuia)
      .innerJoin(guiasTamanho, eq(guiasTamanho.id, produtoGuia.guiaId))
      .where(eq(produtoGuia.productId, productId))
      .limit(1);
    return r?.g ?? null;
  } catch {
    return null;
  }
}

export async function guiaIdDoProduto(productId: string): Promise<string | null> {
  try {
    const [r] = await db.select().from(produtoGuia).where(eq(produtoGuia.productId, productId)).limit(1);
    return r?.guiaId ?? null;
  } catch {
    return null;
  }
}
