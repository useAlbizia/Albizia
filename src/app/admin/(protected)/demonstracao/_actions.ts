"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { apagarDemo, gerarDemo } from "@/lib/demo";

export type DemoState = { ok?: string; erro?: string };

export async function gerarExemplo(_prev: DemoState): Promise<DemoState> {
  await requireAdmin();
  try {
    const r = await gerarDemo(40);
    await logAudit({ action: "demo.gerar", entity: "demo", entityId: "", detail: r });
    revalidatePath("/admin", "layout");
    return { ok: `Pronto: ${r.pedidos} vendas e ${r.lancamentos} gastos de exemplo. Passeie pelo painel.` };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível gerar o exemplo." };
  }
}

export async function apagarExemplo(_prev: DemoState): Promise<DemoState> {
  await requireAdmin();
  const r = await apagarDemo();
  await logAudit({ action: "demo.apagar", entity: "demo", entityId: "", detail: r });
  revalidatePath("/admin", "layout");
  return { ok: `Exemplo apagado: ${r.pedidos} vendas e ${r.lancamentos} gastos removidos. Só sobrou o que é real.` };
}
