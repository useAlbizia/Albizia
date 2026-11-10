import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "./db/client";
import { lancamentoAprovacoes, lancamentos, socios } from "./db/schema";
import { brl } from "./format";
import { emailButton, emailShell, esc, sendEmail, SITE } from "./email";
import { situacaoAprovacao, type Voto } from "./financeiro-calc";

// Aprovação de lançamentos entre sócios.
//
// Arquivo comum, não de server actions: estas funções não conferem login
// sozinhas. Quem chama (as ações do painel) já exigiu administrador.

const NOME_TIPO: Record<string, string> = {
  despesa: "Gasto",
  receita: "Entrada",
  aporte: "Aporte de sócio",
  devolucao_aporte: "Devolução a sócio",
  distribuicao_lucro: "Divisão de lucro",
};

export async function socioPorEmail(email: string | null | undefined) {
  if (!email) return null;
  const todos = await db.select().from(socios).where(eq(socios.ativo, true));
  return todos.find((s) => s.email && s.email.toLowerCase() === email.toLowerCase()) ?? null;
}

/** Os lançamentos de uma chave: a compra parcelada inteira, ou um só. */
function daChave(chave: string) {
  return or(eq(lancamentos.grupoId, chave), eq(lancamentos.id, chave));
}

/** Recalcula e grava a situação de todos os lançamentos da chave. */
export async function recalcularAprovacao(chave: string): Promise<"pendente" | "aprovado" | "contestado"> {
  const [primeiro] = await db.select().from(lancamentos).where(daChave(chave)).limit(1);
  if (!primeiro) return "pendente";
  const [ativos, votos] = await Promise.all([
    db.select({ id: socios.id }).from(socios).where(eq(socios.ativo, true)),
    db.select().from(lancamentoAprovacoes).where(eq(lancamentoAprovacoes.chave, chave)),
  ]);
  const sit = situacaoAprovacao(
    primeiro.criadoPorSocioId,
    ativos.map((a) => a.id),
    votos.map<Voto>((v) => ({ socioId: v.socioId, decisao: v.decisao as Voto["decisao"] })),
  );
  await db.update(lancamentos).set({ aprovacao: sit, updatedAt: new Date() }).where(daChave(chave));
  return sit;
}

/** Resumo do lançamento para o e-mail: "Gasto · Prensa · R$ 2.400,00 em 12x". */
async function resumo(chave: string) {
  const linhas = await db.select().from(lancamentos).where(daChave(chave));
  const l = linhas[0];
  const total = linhas.reduce((n, x) => n + x.valorCents, 0);
  const parcelas = linhas.length > 1 ? ` em ${linhas.length}x` : "";
  return { l, texto: `${NOME_TIPO[l?.tipo ?? ""] ?? "Lançamento"} · ${l?.descricao ?? ""} · ${brl(total)}${parcelas}` };
}

/** Avisa cada sócio que precisa aprovar. Falha de e-mail nunca derruba o lançamento. */
export async function avisarAprovadores(chave: string, autorNome: string): Promise<void> {
  const { l, texto } = await resumo(chave);
  if (!l) return;
  const outros = await db
    .select()
    .from(socios)
    .where(eq(socios.ativo, true));
  const destinos = outros.filter((s) => s.id !== l.criadoPorSocioId && s.email);
  const link = `${SITE.replace(/\/$/, "")}/admin/lancamentos?aprovar=1`;
  await Promise.all(
    destinos.map((s) =>
      sendEmail({
        to: s.email,
        subject: `Aprovar lançamento de ${autorNome}: ${texto}`,
        html: emailShell(
          "Lançamento para aprovar",
          `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 10px;">Olá, ${esc(s.nome.split(" ")[0])}. ${esc(autorNome)} fez um lançamento no caixa da ALBIZIA, e ele só entra nas contas depois que todos os sócios aprovam.</p>
           <p style="font-size:16px;line-height:1.6;color:#121212;margin:14px 0;"><strong>${esc(texto)}</strong></p>
           <p style="font-size:13px;line-height:1.6;color:#8a857c;margin:0;">Data: ${esc(l.data.split("-").reverse().join("/"))}${l.formaPagamento ? ` · ${esc(l.formaPagamento)}` : ""}${l.fornecedor ? ` · ${esc(l.fornecedor)}` : ""}</p>
           ${emailButton("Ver e aprovar", link)}
           <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:20px 0 0;">Se algo estiver errado, toque em Contestar e diga o porquê. Quem lançou recebe o aviso.</p>`,
        ),
      }).catch(() => false),
    ),
  );
}

/** Avisa quem lançou que alguém contestou. */
export async function avisarContestacao(chave: string, quemContestou: string, motivo: string): Promise<void> {
  const { l, texto } = await resumo(chave);
  if (!l?.criadoPorSocioId) return;
  const [autor] = await db.select().from(socios).where(eq(socios.id, l.criadoPorSocioId));
  if (!autor?.email) return;
  await sendEmail({
    to: autor.email,
    subject: `${quemContestou} contestou seu lançamento: ${texto}`,
    html: emailShell(
      "Lançamento contestado",
      `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 10px;">${esc(quemContestou)} contestou o lançamento abaixo. Ele não entra nas contas até ser corrigido.</p>
       <p style="font-size:16px;line-height:1.6;color:#121212;margin:14px 0;"><strong>${esc(texto)}</strong></p>
       ${motivo ? `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0;">Motivo: “${esc(motivo)}”</p>` : ""}
       ${emailButton("Abrir lançamentos", `${SITE.replace(/\/$/, "")}/admin/lancamentos`)}
       <p style="font-size:12px;line-height:1.7;color:#8a857c;margin:20px 0 0;">Para corrigir, exclua e lance de novo com o valor certo.</p>`,
    ),
  }).catch(() => false);
}

/** Chaves que o sócio ainda precisa aprovar. */
export async function pendentesDe(socioId: string) {
  const pend = await db.select().from(lancamentos).where(eq(lancamentos.aprovacao, "pendente"));
  const minhas = pend.filter((l) => l.criadoPorSocioId !== socioId);
  const chaves = [...new Set(minhas.map((l) => l.grupoId ?? l.id))];
  if (chaves.length === 0) return [];
  const votei = await db
    .select({ chave: lancamentoAprovacoes.chave })
    .from(lancamentoAprovacoes)
    .where(and(eq(lancamentoAprovacoes.socioId, socioId), inArray(lancamentoAprovacoes.chave, chaves)));
  const ja = new Set(votei.map((v) => v.chave));
  return chaves.filter((c) => !ja.has(c));
}
