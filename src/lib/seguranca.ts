import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { errosSistema } from "@/lib/db/schema";
import { registrarErro } from "@/lib/erros";

/**
 * Senha errada no login do PAINEL: cada tentativa fica registrada (baixo,
 * só na tela). Na 5ª tentativa em 15 minutos para o mesmo e-mail, vira um
 * aviso ALTO de segurança, com e-mail para os administradores.
 */
export async function alertarTentativas(email: string): Promise<void> {
  const alvo = email.trim().toLowerCase().slice(0, 120);
  await registrarErro({
    origem: "servidor",
    tipo: "seguranca",
    area: "seguranca",
    gravidade: "baixa",
    caminho: "POST /admin/login",
    mensagem: `Senha errada no login do painel para ${alvo}`,
  });
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(errosSistema)
    .where(
      and(
        eq(errosSistema.area, "seguranca"),
        eq(errosSistema.mensagem, `Senha errada no login do painel para ${alvo}`),
        gt(errosSistema.criadoEm, sql`now() - interval '15 minutes'`),
      ),
    );
  if ((r?.n ?? 0) === 5) {
    await registrarErro({
      origem: "servidor",
      tipo: "seguranca",
      area: "seguranca",
      gravidade: "alta",
      caminho: "POST /admin/login",
      mensagem: `5 tentativas de senha errada em 15 minutos no painel, para ${alvo}. Se não foi você, troque a senha.`,
    });
  }
}
