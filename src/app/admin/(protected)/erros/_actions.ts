"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/dal";
import { limparErros, registrarErro } from "@/lib/erros";

/** Erro que aconteceu no aparelho (celular ou computador) de quem usa o painel. */
export async function registrarErroAparelho(dados: {
  mensagem: string;
  detalhe?: string;
  caminho?: string;
  codigo?: string;
}): Promise<void> {
  const user = await requireAdmin().catch(() => null);
  if (!user) return;
  const h = await headers();
  await registrarErro({
    origem: "aparelho",
    tipo: "navegador",
    caminho: String(dados.caminho ?? "").slice(0, 300),
    mensagem: String(dados.mensagem ?? "").slice(0, 1000),
    detalhe: String(dados.detalhe ?? "").slice(0, 4000),
    codigo: String(dados.codigo ?? "").slice(0, 100),
    usuario: user.email ?? "",
    aparelho: h.get("user-agent") ?? "",
  });
}

export async function limparErrosAntigos(): Promise<void> {
  await requireAdmin();
  await limparErros(new Date(Date.now() - 24 * 60 * 60 * 1000));
  revalidatePath("/admin/erros");
}
