"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { fichaTecnica, insumos } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { parseReais } from "@/lib/financeiro-calc";
import { parseQuantidade, TIPOS_INSUMO, UNIDADES } from "@/lib/ficha-calc";
import { recalcularCustoProduto, recalcularProdutosDoInsumo } from "@/lib/ficha";

export type InsumoState = { ok?: boolean; error?: string; mensagem?: string };

function refresh(productId?: string) {
  revalidatePath("/admin/insumos");
  revalidatePath("/admin/fechamento");
  if (productId) revalidatePath(`/admin/produtos/${productId}`);
}

/** Cria (id vazio) ou atualiza um insumo. Atualizar recalcula todo produto que usa. */
export async function salvarInsumo(id: string, _prev: InsumoState, fd: FormData): Promise<InsumoState> {
  await requireAdmin();

  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { error: "Dê um nome ao insumo." };
  const tipo = String(fd.get("tipo") ?? "");
  if (!TIPOS_INSUMO.some((t) => t.v === tipo)) return { error: "Escolha o tipo." };
  const unidade = String(fd.get("unidade") ?? "");
  if (!(UNIDADES as readonly string[]).includes(unidade)) return { error: "Escolha a unidade." };

  const valor = parseReais(String(fd.get("loteValor") ?? ""));
  if (valor === null || valor <= 0) return { error: "Valor pago inválido. Use, por exemplo, 35,00." };
  const qtd = parseQuantidade(String(fd.get("loteQuantidade") ?? ""));
  if (qtd === null) return { error: "Quantidade inválida. Use, por exemplo, 1000 ou 2,5." };

  const dados = {
    nome,
    tipo,
    unidade,
    loteValorCents: valor,
    loteQuantidadeMil: qtd,
    fornecedor: String(fd.get("fornecedor") ?? "").trim(),
    ativo: id ? fd.get("ativo") === "on" : true,
    updatedAt: new Date(),
  };

  let afetados = 0;
  if (id) {
    const antes = await db.query.insumos.findFirst({ where: eq(insumos.id, id) });
    await db.update(insumos).set(dados).where(eq(insumos.id, id));
    afetados = await recalcularProdutosDoInsumo(id);
    await logAudit({
      action: "insumo.update",
      entity: "insumo",
      entityId: id,
      detail: { nome, de: antes ? { v: antes.loteValorCents, q: antes.loteQuantidadeMil } : null, para: { v: valor, q: qtd } },
    });
  } else {
    const [novo] = await db.insert(insumos).values(dados).returning({ id: insumos.id });
    await logAudit({ action: "insumo.create", entity: "insumo", entityId: novo.id, detail: { nome, v: valor, q: qtd } });
  }
  refresh();
  return {
    ok: true,
    mensagem: afetados ? `Salvo. Custo recalculado em ${afetados} produto(s).` : "Salvo.",
  };
}

// ── Ficha de um produto ─────────────────────────────────────────────────

export async function adicionarNaFicha(productId: string, _prev: InsumoState, fd: FormData): Promise<InsumoState> {
  await requireAdmin();
  const insumoId = String(fd.get("insumoId") ?? "");
  if (!insumoId) return { error: "Escolha o insumo." };
  const qtd = parseQuantidade(String(fd.get("quantidade") ?? ""));
  if (qtd === null) return { error: "Quantidade inválida. Use, por exemplo, 1 ou 0,25." };

  const insumo = await db.query.insumos.findFirst({ where: eq(insumos.id, insumoId) });
  if (!insumo) return { error: "Insumo não encontrado." };
  if (insumo.tipo === "embalagem_pedido") {
    // O envelope é um por pedido, não por peça; na ficha ele seria contado
    // uma vez para cada peça do pedido.
    return { error: "Embalagem do pedido não entra na ficha da peça: ela já é contada uma vez por pedido." };
  }

  // Mesmo insumo duas vezes vira uma linha só, com a quantidade somada.
  const existente = await db.query.fichaTecnica.findFirst({
    where: and(eq(fichaTecnica.productId, productId), eq(fichaTecnica.insumoId, insumoId)),
  });
  if (existente) {
    await db
      .update(fichaTecnica)
      .set({ quantidadeMil: existente.quantidadeMil + qtd })
      .where(eq(fichaTecnica.id, existente.id));
  } else {
    await db.insert(fichaTecnica).values({ productId, insumoId, quantidadeMil: qtd });
  }
  const custo = await recalcularCustoProduto(productId);
  await logAudit({ action: "ficha.add", entity: "product", entityId: productId, detail: { insumo: insumo.nome, qtd, custo } });
  refresh(productId);
  return { ok: true };
}

export async function removerDaFicha(productId: string, linhaId: string): Promise<void> {
  await requireAdmin();
  await db.delete(fichaTecnica).where(and(eq(fichaTecnica.id, linhaId), eq(fichaTecnica.productId, productId)));
  const custo = await recalcularCustoProduto(productId);
  await logAudit({ action: "ficha.remove", entity: "product", entityId: productId, detail: { linhaId, custo } });
  refresh(productId);
}

/** Copia a ficha de outro produto (as cores de um mesmo modelo têm a mesma receita). */
export async function copiarFicha(destinoId: string, origemId: string): Promise<InsumoState> {
  await requireAdmin();
  if (!origemId || origemId === destinoId) return { error: "Escolha outro produto." };
  const origem = await db.select().from(fichaTecnica).where(eq(fichaTecnica.productId, origemId));
  if (origem.length === 0) return { error: "Esse produto ainda não tem ficha." };

  await db.transaction(async (tx) => {
    await tx.delete(fichaTecnica).where(eq(fichaTecnica.productId, destinoId));
    await tx
      .insert(fichaTecnica)
      .values(origem.map((l) => ({ productId: destinoId, insumoId: l.insumoId, quantidadeMil: l.quantidadeMil })));
  });
  const custo = await recalcularCustoProduto(destinoId);
  await logAudit({ action: "ficha.copy", entity: "product", entityId: destinoId, detail: { origemId, custo } });
  refresh(destinoId);
  return { ok: true, mensagem: "Ficha copiada." };
}
