"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { guiasTamanho, produtoGuia, products } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

const limpa = (s: unknown, n = 40) => String(s ?? "").trim().slice(0, n);

export async function salvarGuia(dados: {
  id?: string;
  nome: string;
  colunas: string[];
  linhas: string[][];
  observacao: string;
}): Promise<{ id?: string; erro?: string }> {
  await requireAdmin();
  const nome = limpa(dados.nome, 80);
  if (!nome) return { erro: "Dê um nome ao guia (ex.: Peruana manga over)." };
  const colunas = (dados.colunas ?? []).map((c) => limpa(c)).slice(0, 8);
  if (colunas.length < 2 || colunas.some((c) => !c)) return { erro: "Preencha o nome de todas as colunas (mínimo 2)." };
  const linhas = (dados.linhas ?? [])
    .map((l) => colunas.map((_, i) => limpa(l?.[i])))
    .filter((l) => l.some(Boolean))
    .slice(0, 12);
  if (linhas.length === 0) return { erro: "Coloque pelo menos um tamanho." };
  const observacao = limpa(dados.observacao, 300);
  let id = dados.id;
  if (id) {
    await db.update(guiasTamanho).set({ nome, colunas, linhas, observacao }).where(eq(guiasTamanho.id, id));
  } else {
    const [g] = await db.insert(guiasTamanho).values({ nome, colunas, linhas, observacao }).returning({ id: guiasTamanho.id });
    id = g.id;
  }
  await logAudit({ action: "guia.salvar", entity: "guia", entityId: id, detail: { nome } });
  revalidatePath("/admin/guias");
  revalidatePath("/produto/[slug]", "page");
  return { id };
}

export async function excluirGuia(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(guiasTamanho).where(eq(guiasTamanho.id, id));
  await logAudit({ action: "guia.excluir", entity: "guia", entityId: id });
  revalidatePath("/admin/guias");
  revalidatePath("/produto/[slug]", "page");
}

/**
 * Liga um produto a um guia (ou tira, com guiaId vazio). Com `todasCores`,
 * vale para todas as cores do mesmo modelo (mesmo grupo de cor).
 */
export async function definirGuia(productId: string, guiaId: string, todasCores: boolean): Promise<{ ok?: string; erro?: string }> {
  await requireAdmin();
  const [p] = await db.select({ id: products.id, grupo: products.colorGroup }).from(products).where(eq(products.id, productId));
  if (!p) return { erro: "Produto não encontrado." };
  const alvos =
    todasCores && p.grupo
      ? (await db.select({ id: products.id }).from(products).where(and(isNotNull(products.colorGroup), eq(products.colorGroup, p.grupo)))).map((x) => x.id)
      : [p.id];
  for (const id of alvos) {
    await db.delete(produtoGuia).where(eq(produtoGuia.productId, id));
    if (guiaId) await db.insert(produtoGuia).values({ productId: id, guiaId });
  }
  await logAudit({ action: "guia.produto", entity: "produto", entityId: productId, detail: { guiaId, produtos: alvos.length } });
  revalidatePath(`/admin/produtos/${productId}`);
  revalidatePath("/produto/[slug]", "page");
  return { ok: guiaId ? `Guia aplicado a ${alvos.length} ${alvos.length === 1 ? "produto" : "produtos"}.` : "Guia removido." };
}
