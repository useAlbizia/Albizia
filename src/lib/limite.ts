import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { lt, sql } from "drizzle-orm";
import { db } from "./db/client";
import { limitesUso } from "./db/schema";

// Limite de uso por janela de tempo, guardado no banco: na Vercel cada acesso
// pode cair num servidor diferente, então contar na memória não segura nada.
// Protege o chat (cada mensagem custa dinheiro na Anthropic) e o formulário
// de atendimento (ninguém lota a caixa da equipe com protocolo falso).

/** Quem está pedindo, sem guardar o IP em si: só um resumo dele. */
export async function quemPede(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "sem-ip";
  return createHash("sha256").update(`albizia:${ip}`).digest("hex").slice(0, 24);
}

/**
 * Conta mais um uso e diz se ainda está dentro do limite. Se o banco falhar,
 * libera: o limite é proteção, não pode derrubar o atendimento.
 */
export async function dentroDoLimite(chave: string, maximo: number, janelaSegundos: number): Promise<boolean> {
  const inicio = new Date(Math.floor(Date.now() / (janelaSegundos * 1000)) * janelaSegundos * 1000);
  try {
    const [r] = await db
      .insert(limitesUso)
      .values({ chave, janela: inicio, contagem: 1 })
      .onConflictDoUpdate({
        target: [limitesUso.chave, limitesUso.janela],
        set: { contagem: sql`${limitesUso.contagem} + 1` },
      })
      .returning({ contagem: limitesUso.contagem });
    // Faxina de vez em quando: janelas com mais de 2 dias não servem mais.
    if (Math.random() < 0.02) {
      await db.delete(limitesUso).where(lt(limitesUso.janela, new Date(Date.now() - 2 * 86400_000))).catch(() => {});
    }
    return (r?.contagem ?? 0) <= maximo;
  } catch (err) {
    console.error("limite de uso falhou", err);
    return true;
  }
}
