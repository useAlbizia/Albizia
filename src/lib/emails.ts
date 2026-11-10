import "server-only";
import { and, desc, eq, ilike, isNotNull, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db/client";
import { emailMensagens } from "./db/schema";

// Leitura da caixa de e-mail do painel. Fica fora de _actions.ts de
// propósito: tudo que é exportado de um arquivo "use server" vira endereço
// que qualquer um pode chamar, e estas funções não conferem login sozinhas
// (quem as chama é a página, que já exige administrador).

export const PASTAS = ["entrada", "importantes", "enviados", "arquivados", "spam", "lixeira"] as const;
export type Pasta = (typeof PASTAS)[number];

function filtroDaPasta(p: Pasta): SQL | undefined {
  const viva = isNull(emailMensagens.excluidoEm);
  switch (p) {
    case "entrada":
      return and(viva, eq(emailMensagens.direcao, "in"), eq(emailMensagens.arquivado, false), eq(emailMensagens.spam, false));
    case "importantes":
      return and(viva, eq(emailMensagens.importante, true));
    case "enviados":
      return and(viva, eq(emailMensagens.direcao, "out"));
    case "arquivados":
      return and(viva, eq(emailMensagens.arquivado, true), eq(emailMensagens.spam, false));
    case "spam":
      return and(viva, eq(emailMensagens.spam, true));
    case "lixeira":
      return isNotNull(emailMensagens.excluidoEm);
  }
}

export async function listarEmails(pasta: Pasta, busca: string) {
  const conds: (SQL | undefined)[] = [filtroDaPasta(pasta)];
  const q = busca.trim().slice(0, 100);
  if (q) {
    // % e _ digitados na busca são texto, não curinga.
    const t = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    conds.push(
      or(ilike(emailMensagens.assunto, t), ilike(emailMensagens.deEmail, t), ilike(emailMensagens.deNome, t), ilike(emailMensagens.paraEmail, t), ilike(emailMensagens.texto, t)),
    );
  }
  return db
    .select({
      id: emailMensagens.id,
      direcao: emailMensagens.direcao,
      deEmail: emailMensagens.deEmail,
      deNome: emailMensagens.deNome,
      paraEmail: emailMensagens.paraEmail,
      assunto: emailMensagens.assunto,
      resumo: sql<string>`left(coalesce(${emailMensagens.texto}, ''), 140)`,
      lido: emailMensagens.lido,
      importante: emailMensagens.importante,
      createdAt: emailMensagens.createdAt,
    })
    .from(emailMensagens)
    .where(and(...conds))
    .orderBy(desc(emailMensagens.createdAt))
    .limit(100);
}

export async function abrirEmail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const m = await db.query.emailMensagens.findFirst({ where: eq(emailMensagens.id, id) });
  if (m && !m.lido) await db.update(emailMensagens).set({ lido: true }).where(eq(emailMensagens.id, id));
  return m ?? null;
}

/** Não lidos na entrada, para o número no menu. */
export async function contarNaoLidos(): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailMensagens)
    .where(and(filtroDaPasta("entrada"), eq(emailMensagens.lido, false)));
  return r?.n ?? 0;
}

/** Lixeira com mais de 30 dias se esvazia sozinha. */
export async function limparLixeiraAntiga(): Promise<void> {
  await db
    .delete(emailMensagens)
    .where(and(isNotNull(emailMensagens.excluidoEm), lt(emailMensagens.excluidoEm, sql`now() - interval '30 days'`)));
}
