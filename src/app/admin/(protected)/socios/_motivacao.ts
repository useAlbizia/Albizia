"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { enviarMotivacao, salvarConfigMotivacao } from "@/lib/motivacao";

export type MotivacaoState = { ok?: string; error?: string };

export async function salvarMotivacao(_prev: MotivacaoState, fd: FormData): Promise<MotivacaoState> {
  await requireAdmin();
  const ativa = fd.get("ativa") === "on";
  const frequencia = String(fd.get("frequencia") ?? "diaria");
  try {
    await salvarConfigMotivacao(ativa, frequencia);
  } catch {
    return { error: "Não foi possível salvar. A atualização do banco já foi aplicada?" };
  }
  await logAudit({ action: "motivacao.config", entity: "motivacao", entityId: "config", detail: { ativa, frequencia } });
  revalidatePath("/admin/socios");
  return { ok: "Salvo." };
}

export async function enviarMotivacaoAgora(_prev: MotivacaoState): Promise<MotivacaoState> {
  await requireAdmin();
  const r = await enviarMotivacao({ forcar: true });
  if (!r.enviado) return { error: r.motivo ?? "Não foi possível enviar agora." };
  await logAudit({ action: "motivacao.envio", entity: "motivacao", entityId: "config", detail: { assunto: r.assunto } });
  revalidatePath("/admin/socios");
  return { ok: `Enviado: "${r.assunto}".` };
}
