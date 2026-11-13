import "server-only";
import { and, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { errosSistema } from "@/lib/db/schema";
import {
  areaDoCaminho,
  chaveDoErro,
  gravidadeDe,
  intervaloAvisoMin,
  ROTULO_AREA,
  ROTULO_GRAVIDADE,
  type Area,
  type Gravidade,
} from "@/lib/erros-regras";

// Registro de erros do sistema inteiro: loja, compra, pagamento, cadastro,
// estoque, frete, e-mail, segurança e painel. Cada erro ganha ÁREA e
// GRAVIDADE (lib/erros-regras.ts). Crítico e alto mandam e-mail na hora para
// os administradores (variável ORDER_NOTIFICATION_EMAIL: Nilson e Jair), com
// o mesmo erro segurado por 15 min (crítico) ou 1 h (alto) para não lotar a
// caixa. Médio vai no resumo diário. Baixo fica só na tela.
//
// Nunca pode, ele mesmo, causar problema: tudo em try, com limite de tamanho
// e tempo máximo. Se o erro FOR o banco fora do ar, gravar também falha; aí
// vai só o log da Vercel (console.error) e o e-mail de aviso, que não depende
// do banco.

export type NovoErro = {
  origem: "servidor" | "aparelho";
  tipo?: string;
  caminho?: string;
  mensagem: string;
  detalhe?: string;
  codigo?: string;
  usuario?: string;
  aparelho?: string;
  /** Força a área (senão vem do caminho). */
  area?: Area;
  /** Força a gravidade (senão vem das regras). */
  gravidade?: Gravidade;
};

const corta = (s: string | undefined, n: number) => (s ?? "").slice(0, n);
const SITE = "https://www.usealbizia.com.br";

/** Erro de banco, para separar "o banco falhou" de "o código falhou". */
export function tipoDoErro(mensagem: string, padrao: string): string {
  if (/connect|ECONN|timeout|terminat|too many|pool|postgres|ETIMEDOUT|ENOTFOUND|Failed query|EMAXCONN/i.test(mensagem)) return "banco";
  return padrao;
}

function destinatarios(): string[] {
  return (process.env.ERROS_EMAIL || process.env.ORDER_NOTIFICATION_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));
}

async function avisarPorEmail(e: {
  gravidade: Gravidade;
  area: Area;
  caminho: string;
  mensagem: string;
  detalhe: string;
  repeticoes: number;
}): Promise<void> {
  const para = destinatarios();
  if (para.length === 0) return;
  const { sendEmailDetailed, emailShell, emailButton, esc } = await import("@/lib/email");
  const g = ROTULO_GRAVIDADE[e.gravidade];
  const area = ROTULO_AREA[e.area];
  const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  await sendEmailDetailed({
    semRegistrarFalha: true,
    from: "ALBIZIA <acesso@usealbizia.com.br>",
    to: para,
    subject: `${e.gravidade === "critica" ? "🔴 ERRO CRÍTICO" : "🟠 Erro"} na ${area}: ${e.mensagem.slice(0, 80)}`,
    html: emailShell(
      `Erro ${g.toLowerCase()} · ${area}`,
      `<p style="font-size:15px;line-height:1.6;color:#121212;margin:0 0 12px;"><strong>${esc(e.mensagem)}</strong></p>
       <table style="font-size:14px;line-height:1.7;color:#121212;border-collapse:collapse;">
         <tr><td style="padding-right:14px;color:#55534e;">Gravidade</td><td><strong>${esc(g)}</strong></td></tr>
         <tr><td style="padding-right:14px;color:#55534e;">Área</td><td>${esc(area)}</td></tr>
         <tr><td style="padding-right:14px;color:#55534e;">Onde</td><td>${esc(e.caminho || "-")}</td></tr>
         <tr><td style="padding-right:14px;color:#55534e;">Quando</td><td>${esc(quando)}</td></tr>
         ${e.repeticoes > 1 ? `<tr><td style="padding-right:14px;color:#55534e;">Repetições</td><td>${e.repeticoes} vezes na última hora</td></tr>` : ""}
       </table>
       ${e.detalhe ? `<pre style="margin:16px 0 0;padding:12px;background:#f6f2ea;font-size:11px;white-space:pre-wrap;word-break:break-all;color:#55534e;">${esc(e.detalhe.slice(0, 1500))}</pre>` : ""}
       <p style="font-size:13px;line-height:1.6;color:#55534e;margin:16px 0 0;">${
         e.gravidade === "critica"
           ? "Crítico: pode haver venda ou pagamento sendo perdido. Veja agora."
           : "Algo importante parou de funcionar. Veja quando puder."
       } Se o mesmo erro continuar, um novo aviso só sai depois de ${intervaloAvisoMin(e.gravidade)} min.</p>
       ${emailButton("Ver erros do sistema", `${SITE}/admin/erros`)}`,
    ),
  }).catch(() => {});
}

export async function registrarErro(e: NovoErro): Promise<void> {
  const caminho = corta(e.caminho, 300);
  const mensagem = corta(e.mensagem, 1000) || "(sem mensagem)";
  const tipo = corta(e.tipo, 30);
  const area = e.area ?? areaDoCaminho(caminho);
  const gravidade = e.gravidade ?? gravidadeDe({ origem: e.origem, tipo, area });
  const chave = chaveDoErro(area, caminho, mensagem);
  console.error(`[erro ${gravidade}]`, area, caminho, mensagem);

  const intervalo = intervaloAvisoMin(gravidade);
  let id: string | null = null;
  let jaAvisado = false;
  let repeticoes = 1;
  try {
    await Promise.race([
      (async () => {
        if (intervalo) {
          const [r] = await db
            .select({
              avisado: sql<boolean>`bool_or(${errosSistema.notificado} and ${errosSistema.criadoEm} > now() - make_interval(mins => ${intervalo}))`,
              n: sql<number>`count(*)::int`,
            })
            .from(errosSistema)
            .where(and(eq(errosSistema.chave, chave), gt(errosSistema.criadoEm, sql`now() - interval '1 hour'`)));
          jaAvisado = !!r?.avisado;
          repeticoes = (r?.n ?? 0) + 1;
        }
        const [linha] = await db
          .insert(errosSistema)
          .values({
            origem: e.origem,
            tipo,
            caminho,
            mensagem,
            detalhe: corta(e.detalhe, 4000),
            codigo: corta(e.codigo, 100),
            usuario: corta(e.usuario, 200),
            aparelho: corta(e.aparelho, 300),
            gravidade,
            area,
            chave,
          })
          .returning({ id: errosSistema.id });
        id = linha?.id ?? null;
      })(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado ao gravar erro")), 5000)),
    ]);
  } catch (err) {
    // Banco fora: não sabemos se já avisamos. Avisa assim mesmo se for
    // crítico (é exatamente a hora de saber).
    console.error("[erro ao registrar erro]", err);
    jaAvisado = gravidade !== "critica";
  }

  if (intervalo && !jaAvisado) {
    await avisarPorEmail({ gravidade, area, caminho, mensagem, detalhe: corta(e.detalhe, 1500), repeticoes });
    if (id) await db.update(errosSistema).set({ notificado: true }).where(eq(errosSistema.id, id)).catch(() => {});
  }

  // Guarda só os 3.000 mais recentes, de vez em quando.
  if (Math.random() < 0.03) {
    await db
      .execute(sql`delete from erros_sistema where criado_em < (select criado_em from erros_sistema order by criado_em desc offset 3000 limit 1)`)
      .catch(() => {});
  }
}

export type FiltroErros = { gravidade?: string; area?: string; abertos?: boolean };

export async function listarErros(limite = 200, filtro: FiltroErros = {}) {
  try {
    const conds = [];
    if (filtro.gravidade) conds.push(eq(errosSistema.gravidade, filtro.gravidade));
    if (filtro.area) conds.push(eq(errosSistema.area, filtro.area));
    if (filtro.abertos) conds.push(eq(errosSistema.resolvido, false));
    const erros = await db
      .select()
      .from(errosSistema)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(errosSistema.criadoEm))
      .limit(limite);
    return { erros, pronto: true };
  } catch {
    return { erros: [], pronto: false };
  }
}

/** Críticos e altos em aberto dos últimos 7 dias: o número do menu. */
export async function contarErrosGraves(): Promise<number> {
  try {
    const [r] = await db
      .select({ n: sql<number>`count(distinct ${errosSistema.chave})::int` })
      .from(errosSistema)
      .where(
        and(
          inArray(errosSistema.gravidade, ["critica", "alta"]),
          eq(errosSistema.resolvido, false),
          gt(errosSistema.criadoEm, sql`now() - interval '7 days'`),
        ),
      );
    return r?.n ?? 0;
  } catch {
    return 0;
  }
}

/** Marca como resolvido o erro e todas as repetições dele (mesma chave). */
export async function resolverErro(id: string): Promise<void> {
  const [e] = await db.select({ chave: errosSistema.chave }).from(errosSistema).where(eq(errosSistema.id, id));
  if (!e) return;
  await db.update(errosSistema).set({ resolvido: true }).where(e.chave ? eq(errosSistema.chave, e.chave) : eq(errosSistema.id, id));
}

export async function limparErros(antesDe: Date): Promise<number> {
  const r = await db.delete(errosSistema).where(lt(errosSistema.criadoEm, antesDe)).returning({ id: errosSistema.id });
  return r.length;
}

/** Resumo diário (10h): os médios das últimas 24 h, se houver. */
export async function resumoDiarioErros(): Promise<number> {
  try {
    const linhas = await db
      .select({
        area: errosSistema.area,
        mensagem: errosSistema.mensagem,
        caminho: errosSistema.caminho,
        n: sql<number>`count(*)::int`,
      })
      .from(errosSistema)
      .where(and(eq(errosSistema.gravidade, "media"), eq(errosSistema.resolvido, false), gt(errosSistema.criadoEm, sql`now() - interval '24 hours'`)))
      .groupBy(errosSistema.area, errosSistema.mensagem, errosSistema.caminho)
      .orderBy(desc(sql`count(*)`))
      .limit(15);
    const para = destinatarios();
    if (linhas.length === 0 || para.length === 0) return 0;
    const { sendEmailDetailed, emailShell, emailButton, esc } = await import("@/lib/email");
    const total = linhas.reduce((s, l) => s + l.n, 0);
    await sendEmailDetailed({
      semRegistrarFalha: true,
      from: "ALBIZIA <acesso@usealbizia.com.br>",
      to: para,
      subject: `Resumo de erros do dia: ${total} ${total === 1 ? "erro médio" : "erros médios"}`,
      html: emailShell(
        "Resumo diário de erros",
        `<p style="font-size:14px;line-height:1.6;color:#121212;margin:0 0 12px;">Erros de gravidade média nas últimas 24 horas. Nenhum é crítico (esses chegam na hora), mas vale olhar.</p>
         <ul style="padding-left:18px;font-size:13px;line-height:1.7;color:#121212;">${linhas
           .map((l) => `<li><strong>${esc(ROTULO_AREA[l.area as Area] ?? l.area)}</strong> · ${esc(l.mensagem.slice(0, 140))} <span style="color:#55534e;">(${l.n}x, ${esc(l.caminho.slice(0, 60))})</span></li>`)
           .join("")}</ul>
         ${emailButton("Ver erros do sistema", `${SITE}/admin/erros`)}`,
      ),
    });
    return total;
  } catch (err) {
    console.error("resumoDiarioErros falhou", err);
    return 0;
  }
}
