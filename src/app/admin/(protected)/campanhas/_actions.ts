"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { campanhasFrete } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { ACOES } from "@/lib/campanhas";
import { parseReais } from "@/lib/financeiro-calc";
import { soDigitos, UFS } from "@/lib/regioes";

export type CampanhaState = { ok?: string; erro?: string };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function criarCampanha(_prev: CampanhaState, fd: FormData): Promise<CampanhaState> {
  await requireAdmin();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  if (!nome) return { erro: "Dê um nome (ex.: Frete grátis Sul). Ele aparece para o cliente no checkout." };
  const acao = String(fd.get("acao") ?? "");
  const def = ACOES.find((a) => a.v === acao);
  if (!def) return { erro: "Escolha o que a campanha faz." };

  let valor = 0;
  if (def.unidade === "%") {
    valor = Math.round(Number(String(fd.get("valor") ?? "").replace(",", ".")));
    if (!Number.isFinite(valor) || valor < 1 || valor > 100) return { erro: "Porcentagem de 1 a 100." };
  } else if (def.unidade === "R$") {
    const c = parseReais(String(fd.get("valor") ?? ""));
    if (c === null || c <= 0) return { erro: "Valor em reais inválido. Ex.: 2,50" };
    valor = c;
  }

  const tipo = String(fd.get("tipo") ?? "");
  let ufs: string[] = [];
  let cepInicio = "";
  let cepFim = "";
  if (tipo === "uf") {
    ufs = fd.getAll("ufs").map(String).filter((u) => UFS.includes(u));
    if (ufs.length === 0) return { erro: "Marque pelo menos um estado." };
  } else if (tipo === "cep") {
    cepInicio = soDigitos(String(fd.get("cepInicio") ?? ""));
    cepFim = soDigitos(String(fd.get("cepFim") ?? ""));
    if (cepInicio.length !== 8 || cepFim.length !== 8 || Number(cepInicio) > Number(cepFim)) {
      return { erro: "Faixa de CEP inválida (8 números, o inicial menor que o final)." };
    }
  } else {
    return { erro: "Escolha por estado ou faixa de CEP." };
  }

  const minimo = String(fd.get("minimo") ?? "").trim();
  const minimoCents = minimo ? parseReais(minimo) : 0;
  if (minimoCents === null) return { erro: "Compra mínima inválida. Ex.: 200,00" };

  const inicio = String(fd.get("inicio") ?? "");
  const fim = String(fd.get("fim") ?? "");
  if ((inicio && !DATA.test(inicio)) || (fim && !DATA.test(fim)) || (inicio && fim && inicio > fim)) {
    return { erro: "Período inválido." };
  }

  await db.insert(campanhasFrete).values({
    nome,
    acao,
    valor,
    tipo,
    ufs,
    cepInicio,
    cepFim,
    minimoCents,
    inicio: inicio || null,
    fim: fim || null,
  });
  await logAudit({ action: "frete.campanha", entity: "campanha", entityId: nome, detail: { acao, valor, tipo, ufs } });
  revalidatePath("/admin/campanhas");
  return { ok: "Campanha criada. Já vale no checkout." };
}

export async function alternarCampanha(id: string, ativo: boolean): Promise<void> {
  await requireAdmin();
  await db.update(campanhasFrete).set({ ativo }).where(eq(campanhasFrete.id, id));
  await logAudit({ action: "frete.campanha_ativo", entity: "campanha", entityId: id, detail: { ativo } });
  revalidatePath("/admin/campanhas");
}

export async function excluirCampanha(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(campanhasFrete).where(eq(campanhasFrete.id, id));
  await logAudit({ action: "frete.campanha_excluir", entity: "campanha", entityId: id });
  revalidatePath("/admin/campanhas");
}
