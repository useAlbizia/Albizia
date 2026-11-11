import "server-only";
import { desc, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { errosSistema } from "@/lib/db/schema";

// Registro de erros para a tela "Erros do sistema".
//
// Nunca pode, ela mesma, causar problema: tudo em try, com limite de tamanho,
// e com tempo máximo. Se o erro FOR o banco fora do ar, gravar no banco
// também falha; aí o erro vai só para o log da Vercel (console.error), que
// continua sendo o registro de reserva.

export type NovoErro = {
  origem: "servidor" | "aparelho";
  tipo?: string;
  caminho?: string;
  mensagem: string;
  detalhe?: string;
  codigo?: string;
  usuario?: string;
  aparelho?: string;
};

const corta = (s: string | undefined, n: number) => (s ?? "").slice(0, n);

/** Erro de banco, para o painel separar "o banco falhou" de "o código falhou". */
export function tipoDoErro(mensagem: string, padrao: string): string {
  if (/connect|ECONN|timeout|terminat|too many|pool|postgres|ETIMEDOUT|ENOTFOUND|Failed query/i.test(mensagem)) return "banco";
  return padrao;
}

export async function registrarErro(e: NovoErro): Promise<void> {
  console.error("[erro registrado]", e.origem, e.tipo, e.caminho, e.mensagem);
  try {
    await Promise.race([
      db.insert(errosSistema).values({
        origem: e.origem,
        tipo: corta(e.tipo, 30),
        caminho: corta(e.caminho, 300),
        mensagem: corta(e.mensagem, 1000) || "(sem mensagem)",
        detalhe: corta(e.detalhe, 4000),
        codigo: corta(e.codigo, 100),
        usuario: corta(e.usuario, 200),
        aparelho: corta(e.aparelho, 300),
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado ao gravar erro")), 4000)),
    ]);
    // Guarda só os 2.000 mais recentes, de vez em quando.
    if (Math.random() < 0.05) {
      await db.execute(
        sql`delete from erros_sistema where criado_em < (select criado_em from erros_sistema order by criado_em desc offset 2000 limit 1)`,
      );
    }
  } catch (err) {
    console.error("[erro ao registrar erro]", err);
  }
}

export async function listarErros(limite = 200) {
  try {
    return { erros: await db.select().from(errosSistema).orderBy(desc(errosSistema.criadoEm)).limit(limite), pronto: true };
  } catch {
    return { erros: [], pronto: false };
  }
}

export async function limparErros(antesDe: Date): Promise<number> {
  const r = await db.delete(errosSistema).where(lt(errosSistema.criadoEm, antesDe)).returning({ id: errosSistema.id });
  return r.length;
}
