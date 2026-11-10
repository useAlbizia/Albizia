"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, or } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db/client";
import { lancamentoAprovacoes, lancamentoPagadores, lancamentos, metasMensais, socios } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { isoDay } from "@/lib/format";
import { dividirPorPeso, gerarParcelas, parseReais } from "@/lib/financeiro-calc";
import { sincronizarPendentes } from "@/lib/mp-sync";
import { avisarAprovadores, avisarContestacao, recalcularAprovacao, socioPorEmail } from "@/lib/aprovacao";

export type FinState = { ok?: boolean; error?: string; mensagem?: string };

const TIPOS = ["despesa", "receita", "aporte", "devolucao_aporte", "distribuicao_lucro"] as const;
type Tipo = (typeof TIPOS)[number];

function refresh() {
  revalidatePath("/admin/socios");
  revalidatePath("/admin/lancamentos");
}

/**
 * Lança um movimento no livro caixa.
 *
 * O campo "quem pagou" é o que decide para onde o dinheiro conta:
 * "empresa" sai do caixa; um sócio vira capital investido por ele;
 * "dividir" reparte entre os sócios ativos pelas cotas (a prensa paga pelos
 * três). Compra parcelada vira uma linha por parcela, todas com o mesmo
 * grupo, para cada fatura poder ser marcada como paga no mês dela.
 */
export async function criarLancamento(_prev: FinState, fd: FormData): Promise<FinState> {
  const user = await requireAdmin();

  const tipo = String(fd.get("tipo") ?? "") as Tipo;
  if (!TIPOS.includes(tipo)) return { error: "Escolha o tipo do lançamento." };

  const descricao = String(fd.get("descricao") ?? "").trim();
  if (!descricao) return { error: "Descreva o que foi." };

  const valorCents = parseReais(String(fd.get("valor") ?? ""));
  if (valorCents === null || valorCents <= 0) {
    return { error: "Valor inválido. Use, por exemplo, 1.234,56 ou 89,90." };
  }

  const data = String(fd.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { error: "Data inválida." };

  const parcelas = Math.min(48, Math.max(1, Number(fd.get("parcelas") ?? 1) || 1));
  const quemPagou = String(fd.get("quemPagou") ?? "");
  const socioId = String(fd.get("socioId") ?? "") || null;

  const ativos = await db.select().from(socios).where(eq(socios.ativo, true));
  const autor = await socioPorEmail(user.email);
  const existe = (id: string | null) => !!id && ativos.some((s) => s.id === id);

  // Aporte, devolução e distribuição são sempre de UM sócio.
  if (tipo === "aporte" || tipo === "devolucao_aporte" || tipo === "distribuicao_lucro") {
    if (!existe(socioId)) return { error: "Escolha o sócio." };
  }
  if (tipo === "despesa" && quemPagou !== "empresa" && quemPagou !== "dividir" && !existe(quemPagou)) {
    return { error: "Diga quem pagou." };
  }
  if (tipo !== "despesa" && parcelas > 1) {
    return { error: "Só despesa pode ser parcelada." };
  }

  // Divide o valor de UMA parcela entre quem pagou.
  function pagadoresDe(valor: number): { socioId: string | null; valorCents: number }[] {
    if (tipo !== "despesa") return [];
    if (quemPagou === "empresa") return [{ socioId: null, valorCents: valor }];
    if (quemPagou === "dividir") {
      const partes = dividirPorPeso(valor, ativos.map((s) => s.cotas));
      return ativos.map((s, i) => ({ socioId: s.id, valorCents: partes[i] }));
    }
    return [{ socioId: quemPagou, valorCents: valor }];
  }

  const hoje = isoDay(new Date());
  const linhas =
    parcelas > 1
      ? gerarParcelas(valorCents, parcelas, data, hoje)
      : [{ num: 1, total: 1, data, valorCents, status: "pago" as const }];
  const grupoId = parcelas > 1 ? randomUUID() : null;

  const base = {
    tipo,
    descricao,
    categoria: String(fd.get("categoria") ?? ""),
    fornecedor: String(fd.get("fornecedor") ?? "").trim(),
    formaPagamento: String(fd.get("formaPagamento") ?? ""),
    observacao: String(fd.get("observacao") ?? "").trim(),
    socioId: tipo === "despesa" || tipo === "receita" ? null : socioId,
    criadoPor: user.email ?? "",
    criadoPorSocioId: autor?.id ?? null,
    // Nasce aguardando os outros sócios; o recálculo logo abaixo aprova na
    // hora se não houver ninguém para aprovar.
    aprovacao: "pendente",
    origem: "painel",
  };

  let primeiroId = "";
  await db.transaction(async (tx) => {
    for (const p of linhas) {
      const [l] = await tx
        .insert(lancamentos)
        .values({
          ...base,
          data: p.data,
          valorCents: p.valorCents,
          status: p.status,
          grupoId,
          parcelaNum: grupoId ? p.num : null,
          parcelaTotal: grupoId ? p.total : null,
        })
        .returning({ id: lancamentos.id });
      if (!primeiroId) primeiroId = l.id;
      const pag = pagadoresDe(p.valorCents).filter((x) => x.valorCents > 0);
      if (pag.length) {
        await tx.insert(lancamentoPagadores).values(pag.map((x) => ({ lancamentoId: l.id, ...x })));
      }
    }
  });

  await logAudit({
    action: "financeiro.lancamento",
    entity: "lancamento",
    entityId: grupoId ?? "",
    detail: { tipo, descricao, valorCents, parcelas, quemPagou: quemPagou || socioId },
  });
  const chave = grupoId ?? primeiroId;
  const sit = await recalcularAprovacao(chave);
  if (sit === "pendente") await avisarAprovadores(chave, autor?.nome ?? user.email ?? "Alguém").catch(() => {});
  refresh();

  const previstas = linhas.filter((l) => l.status === "previsto").length;
  const parcelado =
    parcelas > 1
      ? `Lançado em ${parcelas} parcelas (${parcelas - previstas} pagas, ${previstas} previstas). `
      : "Lançado. ";
  return {
    ok: true,
    mensagem:
      sit === "pendente"
        ? parcelado + "Os outros sócios receberam um e-mail para aprovar; até lá ele não entra nas contas."
        : parcelado,
  };
}

/** Marca parcela como paga, ou desfaz. Só "pago" mexe nos saldos. */
export async function alternarStatus(id: string): Promise<void> {
  await requireAdmin();
  const atual = await db.query.lancamentos.findFirst({ where: eq(lancamentos.id, id) });
  if (!atual) return;
  const novo = atual.status === "pago" ? "previsto" : "pago";
  await db.update(lancamentos).set({ status: novo, updatedAt: new Date() }).where(eq(lancamentos.id, id));
  await logAudit({ action: "financeiro.status", entity: "lancamento", entityId: id, detail: { de: atual.status, para: novo, descricao: atual.descricao } });
  refresh();
}

/**
 * Exclui um lançamento, ou a compra parcelada inteira.
 *
 * O que foi apagado fica na auditoria com valor e descrição: em dinheiro de
 * sócio, sumir sem rastro é o que gera desconfiança.
 */
export async function excluirLancamento(id: string, grupoInteiro: boolean): Promise<void> {
  await requireAdmin();
  const atual = await db.query.lancamentos.findFirst({ where: eq(lancamentos.id, id) });
  if (!atual) return;
  if (grupoInteiro && atual.grupoId) {
    await db.delete(lancamentos).where(eq(lancamentos.grupoId, atual.grupoId));
  } else {
    await db.delete(lancamentos).where(eq(lancamentos.id, id));
  }
  await logAudit({
    action: "financeiro.exclusao",
    entity: "lancamento",
    entityId: id,
    detail: {
      descricao: atual.descricao,
      valorCents: atual.valorCents,
      data: atual.data,
      grupoInteiro: grupoInteiro && !!atual.grupoId,
    },
  });
  refresh();
}

export async function salvarSocio(id: string, _prev: FinState, fd: FormData): Promise<FinState> {
  await requireAdmin();
  const nome = String(fd.get("nome") ?? "").trim();
  if (!nome) return { error: "Nome obrigatório." };
  const cotas = Math.max(1, Math.min(100, Number(fd.get("cotas") ?? 1) || 1));
  await db
    .update(socios)
    .set({
      nome,
      email: String(fd.get("email") ?? "").trim().toLowerCase(),
      telefone: String(fd.get("telefone") ?? "").replace(/\D/g, ""),
      cotas,
      ativo: fd.get("ativo") === "on",
    })
    .where(eq(socios.id, id));
  await logAudit({ action: "financeiro.socio", entity: "socio", entityId: id, detail: { nome, cotas } });
  refresh();
  return { ok: true };
}


/**
 * Lê agora no Mercado Pago as vendas que ainda estão sem taxa e liberação.
 * A tela já faz isso sozinha, poucas por vez; o botão serve para quando há
 * muitas acumuladas (por exemplo, depois de reconectar a conta).
 */
export async function sincronizarMercadoPago(): Promise<FinState> {
  await requireAdmin();
  const r = await sincronizarPendentes(100);
  refresh();
  if (r.semToken) return { error: "A conta do Mercado Pago não está conectada." };
  if (r.erros > 0) return { error: `${r.atualizados} venda(s) atualizada(s), ${r.erros} com erro.` };
  return { ok: true, mensagem: r.atualizados ? `${r.atualizados} venda(s) atualizada(s).` : "Tudo já estava em dia." };
}

/** Meta de vendas de um mês. Valor vazio ou zero apaga a meta. */
export async function salvarMeta(mes: string, _prev: FinState, fd: FormData): Promise<FinState> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Mês inválido." };
  const texto = String(fd.get("meta") ?? "").trim();
  const valor = texto ? parseReais(texto) : 0;
  if (valor === null) return { error: "Valor inválido. Use, por exemplo, 5.000,00." };

  if (!valor) {
    await db.delete(metasMensais).where(eq(metasMensais.mes, mes));
  } else {
    await db
      .insert(metasMensais)
      .values({ mes, vendasCents: valor, updatedAt: new Date() })
      .onConflictDoUpdate({ target: metasMensais.mes, set: { vendasCents: valor, updatedAt: new Date() } });
  }
  await logAudit({ action: "financeiro.meta", entity: "meta", entityId: mes, detail: { vendasCents: valor } });
  revalidatePath("/admin/fechamento");
  return { ok: true };
}

/**
 * Voto de um sócio sobre um lançamento (ou a compra parcelada inteira).
 * Só sócio vota, e nunca no que ele mesmo lançou.
 */
export async function votar(chave: string, decisao: "aprovado" | "contestado", comentario: string): Promise<FinState> {
  const user = await requireAdmin();
  if (decisao !== "aprovado" && decisao !== "contestado") return { error: "Decisão inválida." };
  const eu = await socioPorEmail(user.email);
  if (!eu) return { error: "Só sócios aprovam lançamentos. Seu e-mail não está no cadastro de sócios." };

  const [l] = await db.select().from(lancamentos).where(or(eq(lancamentos.grupoId, chave), eq(lancamentos.id, chave))).limit(1);
  if (!l) return { error: "Lançamento não encontrado." };
  if (l.criadoPorSocioId === eu.id) return { error: "Quem lançou não aprova o próprio lançamento." };
  const motivo = comentario.trim().slice(0, 500);
  if (decisao === "contestado" && !motivo) return { error: "Diga o motivo da contestação." };

  await db
    .insert(lancamentoAprovacoes)
    .values({ chave, socioId: eu.id, decisao, comentario: motivo })
    .onConflictDoUpdate({
      target: [lancamentoAprovacoes.chave, lancamentoAprovacoes.socioId],
      set: { decisao, comentario: motivo, createdAt: new Date() },
    });
  const sit = await recalcularAprovacao(chave);
  await logAudit({ action: `financeiro.${decisao}`, entity: "lancamento", entityId: chave, detail: { descricao: l.descricao, motivo, situacao: sit } });
  if (decisao === "contestado") await avisarContestacao(chave, eu.nome, motivo).catch(() => {});
  refresh();
  return { ok: true, mensagem: sit === "aprovado" ? "Aprovado. Já entrou nas contas." : decisao === "contestado" ? "Contestação registrada." : "Aprovação registrada. Falta outro sócio." };
}
