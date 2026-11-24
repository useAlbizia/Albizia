"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { chamados, siteSettings } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { enviarResposta, STATUS, type EventoChamado, type StatusChamado } from "@/lib/chamados";

export type AcaoState = { ok?: boolean; error?: string };

function atualizar(id: string) {
  revalidatePath("/admin/atendimento");
  revalidatePath(`/admin/atendimento/${id}`);
  revalidatePath("/admin", "layout");
}

async function registrar(id: string, evento: EventoChamado, mudar: Partial<typeof chamados.$inferInsert> = {}) {
  await db
    .update(chamados)
    .set({
      ...mudar,
      historico: sql`${chamados.historico} || ${JSON.stringify([evento])}::jsonb`,
      atualizadoEm: new Date(),
    })
    .where(eq(chamados.id, id));
}

/** Responde o cliente por e-mail. Se ainda estava "aberto", passa a "em andamento". */
export async function responder(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const texto = String(fd.get("texto") ?? "").trim();
  const resolver = fd.get("resolver") === "1";
  if (!texto) return { error: "Escreva a resposta." };
  if (texto.length > 10000) return { error: "Resposta longa demais." };

  const c = await db.query.chamados.findFirst({ where: eq(chamados.id, id) });
  if (!c) return { error: "Protocolo não encontrado." };

  const r = await enviarResposta(c, texto, user.email ?? "");
  if (!r.ok) return { error: `O e-mail não saiu: ${r.reason}` };

  const quem = user.email ?? "equipe";
  const novo: StatusChamado = resolver ? "resolvido" : c.status === "aberto" ? "andamento" : (c.status as StatusChamado);
  await registrar(
    id,
    { quando: new Date().toISOString(), quem, tipo: "resposta", texto },
    { status: novo, ...(resolver ? { resolvidoEm: new Date() } : {}) },
  );
  if (novo !== c.status) {
    await registrar(id, { quando: new Date().toISOString(), quem, tipo: "status", texto: `Situação: ${STATUS[novo]}` });
  }
  await logAudit({ action: "chamado.resposta", entity: "chamado", entityId: id, detail: { numero: c.numero, resolver } });
  atualizar(id);
  return { ok: true };
}

/** Anotação interna: só a equipe vê. */
export async function anotar(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  const user = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const texto = String(fd.get("texto") ?? "").trim();
  if (!texto) return { error: "Escreva a anotação." };
  await registrar(id, { quando: new Date().toISOString(), quem: user.email ?? "equipe", tipo: "nota", texto: texto.slice(0, 5000) });
  atualizar(id);
  return { ok: true };
}

export async function mudarStatus(id: string, status: StatusChamado): Promise<void> {
  const user = await requireAdmin();
  if (!(status in STATUS)) return;
  await registrar(
    id,
    { quando: new Date().toISOString(), quem: user.email ?? "equipe", tipo: "status", texto: `Situação: ${STATUS[status]}` },
    { status, resolvidoEm: status === "resolvido" ? new Date() : null },
  );
  await logAudit({ action: "chamado.status", entity: "chamado", entityId: id, detail: { status } });
  atualizar(id);
}

export async function salvarPrazo(_prev: AcaoState, fd: FormData): Promise<AcaoState> {
  await requireAdmin();
  const dias = Math.round(Number(fd.get("dias")));
  if (!Number.isFinite(dias) || dias < 1 || dias > 15) return { error: "Use de 1 a 15 dias úteis." };
  await db.update(siteSettings).set({ atendimentoPrazoDias: dias }).where(eq(siteSettings.id, 1));
  await logAudit({ action: "chamado.prazo", entity: "site_settings", entityId: "1", detail: { dias } });
  revalidatePath("/admin/atendimento");
  return { ok: true };
}
