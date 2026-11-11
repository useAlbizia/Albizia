"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { regrasPrazo, retiradaConfig } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { soDigitos, UFS } from "@/lib/regioes";

export type PrazoState = { ok?: string; erro?: string };

export async function criarRegra(_prev: PrazoState, fd: FormData): Promise<PrazoState> {
  await requireAdmin();
  const tipo = String(fd.get("tipo") ?? "");
  const dias = Number(fd.get("dias") ?? 0);
  if (!Number.isInteger(dias) || dias < 1 || dias > 30) return { erro: "Dias extras: de 1 a 30." };
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  if (tipo === "uf") {
    const uf = String(fd.get("uf") ?? "").toUpperCase();
    if (!UFS.includes(uf)) return { erro: "Escolha o estado." };
    await db.insert(regrasPrazo).values({ tipo, uf, diasExtra: dias, nome: nome || uf });
  } else if (tipo === "cep") {
    const ini = soDigitos(String(fd.get("cepInicio") ?? ""));
    const fim = soDigitos(String(fd.get("cepFim") ?? ""));
    if (ini.length !== 8 || fim.length !== 8) return { erro: "CEP com 8 números, no começo e no fim da faixa." };
    if (Number(ini) > Number(fim)) return { erro: "O CEP inicial precisa ser menor que o final." };
    await db.insert(regrasPrazo).values({ tipo, cepInicio: ini, cepFim: fim, diasExtra: dias, nome: nome || `CEP ${ini}-${fim}` });
  } else {
    return { erro: "Escolha estado ou faixa de CEP." };
  }
  await logAudit({ action: "frete.prazo_regra", entity: "regra_prazo", entityId: tipo, detail: { dias, nome } });
  revalidatePath("/admin/prazos");
  return { ok: "Regra criada. Já vale no checkout." };
}

export async function alternarRegra(id: string, ativo: boolean): Promise<void> {
  await requireAdmin();
  await db.update(regrasPrazo).set({ ativo }).where(eq(regrasPrazo.id, id));
  await logAudit({ action: "frete.prazo_regra_ativo", entity: "regra_prazo", entityId: id, detail: { ativo } });
  revalidatePath("/admin/prazos");
}

export async function excluirRegra(id: string): Promise<void> {
  await requireAdmin();
  await db.delete(regrasPrazo).where(eq(regrasPrazo.id, id));
  await logAudit({ action: "frete.prazo_regra_excluir", entity: "regra_prazo", entityId: id });
  revalidatePath("/admin/prazos");
}

export async function salvarRetirada(_prev: PrazoState, fd: FormData): Promise<PrazoState> {
  await requireAdmin();
  const ativo = fd.get("ativo") === "on";
  const endereco = String(fd.get("endereco") ?? "").trim().slice(0, 300);
  const instrucoes = String(fd.get("instrucoes") ?? "").trim().slice(0, 500);
  const prazoDias = Math.min(30, Math.max(0, Number(fd.get("prazoDias") ?? 1) || 0));
  if (ativo && !endereco) return { erro: "Para ligar a retirada, preencha o endereço." };
  await db
    .insert(retiradaConfig)
    .values({ id: "config", ativo, endereco, instrucoes, prazoDias })
    .onConflictDoUpdate({ target: retiradaConfig.id, set: { ativo, endereco, instrucoes, prazoDias, updatedAt: new Date() } });
  await logAudit({ action: "frete.retirada", entity: "retirada", entityId: "config", detail: { ativo } });
  revalidatePath("/admin/prazos");
  return { ok: ativo ? "Retirada ligada: já aparece no checkout." : "Salvo. A retirada está desligada." };
}
