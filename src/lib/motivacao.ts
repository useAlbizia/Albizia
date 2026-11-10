import "server-only";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { motivacao, socios } from "@/lib/db/schema";
import { emailButton, emailShell, esc, sendEmailDetailed } from "@/lib/email";
import { MOTIVACOES, type Motivacao } from "@/lib/motivacao-conteudo";

// E-mails de motivação para os sócios: uma história real de quem começou do
// zero, um versículo e uma tarefa do dia. Saem sozinhos pelo agendamento
// diário (api/low-stock-check, 10h de Brasília) e podem ser ligados,
// desligados e espaçados pela tabela motivacao (fora do painel, a pedido).
//
// Destinatários: os sócios ATIVOS com e-mail no cadastro. Nenhum endereço
// fica no código.

export type Frequencia = "diaria" | "seg_qua_sex" | "semanal";

export const FREQUENCIAS: { v: Frequencia; label: string }[] = [
  { v: "diaria", label: "Todo dia" },
  { v: "seg_qua_sex", label: "Segunda, quarta e sexta" },
  { v: "semanal", label: "Uma vez por semana (segunda)" },
];

export type ConfigMotivacao = {
  ativa: boolean;
  frequencia: Frequencia;
  proxima: number;
  ultimoEnvio: string | null;
  /** Falso enquanto a atualização do banco (0029) não foi aplicada. */
  pronta: boolean;
};

const REMETENTE = "ALBIZIA <acesso@usealbizia.com.br>";
const PAINEL = "https://www.usealbizia.com.br/admin";

function freqValida(v: string): Frequencia {
  return (FREQUENCIAS.some((f) => f.v === v) ? v : "diaria") as Frequencia;
}

/**
 * A configuração atual. Nunca derruba a página: se a tabela ainda não
 * existe (código publicado antes da atualização do banco), devolve
 * "não pronta" e o envio fica parado.
 */
export async function lerMotivacao(): Promise<ConfigMotivacao> {
  try {
    const r = await db.query.motivacao.findFirst({ where: eq(motivacao.id, "config") });
    return {
      ativa: r?.ativa ?? true,
      frequencia: freqValida(r?.frequencia ?? "diaria"),
      proxima: (r?.proxima ?? 0) % MOTIVACOES.length,
      ultimoEnvio: r?.ultimoEnvio ?? null,
      pronta: true,
    };
  } catch {
    return { ativa: false, frequencia: "diaria", proxima: 0, ultimoEnvio: null, pronta: false };
  }
}

export async function salvarConfigMotivacao(ativa: boolean, frequencia: string): Promise<void> {
  const freq = freqValida(frequencia);
  await db
    .insert(motivacao)
    .values({ id: "config", ativa, frequencia: freq })
    .onConflictDoUpdate({ target: motivacao.id, set: { ativa, frequencia: freq, updatedAt: new Date() } });
}

/** Data e dia da semana em Brasília (0 = domingo). */
export function hojeBrasil(agora = new Date()): { data: string; diaSemana: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(agora);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { data: `${p("year")}-${p("month")}-${p("day")}`, diaSemana: dias.indexOf(p("weekday")) };
}

export function eDiaDeEnvio(freq: Frequencia, diaSemana: number): boolean {
  if (freq === "seg_qua_sex") return diaSemana === 1 || diaSemana === 3 || diaSemana === 5;
  if (freq === "semanal") return diaSemana === 1;
  return true;
}

/** O HTML de uma mensagem, com o modelo e a marca de todos os e-mails. */
export function montarMotivacao(m: Motivacao, numero: number): string {
  const p = (t: string, estilo = "") =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#121212;${estilo}">${t}</p>`;
  const corpo =
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(m.versiculo.texto)}</div>` +
    p("Sócios,") +
    `<p style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#121212;font-weight:600;">${esc(m.titulo)}</p>` +
    p(esc(m.abertura)) +
    `<div style="margin:22px 0;padding:18px 20px;background:#f6f2ea;border-left:3px solid #121212;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#121212;">${esc(m.historia.quem)}</p>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#121212;">${esc(m.historia.texto)}</p>
    </div>` +
    p(`<strong>${esc(m.licao)}</strong>`) +
    `<div style="margin:30px 0;padding:26px 22px;background:#121212;text-align:center;">
      <p style="margin:0 0 12px;font-size:18px;line-height:1.55;color:#f4efe6;font-style:italic;">&ldquo;${esc(m.versiculo.texto)}&rdquo;</p>
      <p style="margin:0;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#9a948a;">${esc(m.versiculo.ref)}</p>
    </div>` +
    p(`<strong>${esc(m.chamada)}</strong>`) +
    emailButton("Abrir o aplicativo", PAINEL) +
    `<p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#9a948a;text-align:center;">Estamos num caminho que não tem volta. O nome dele é sucesso.<br>Mensagem ${numero} de ${MOTIVACOES.length}</p>`;
  return emailShell("Motivação dos sócios", corpo);
}

export type ResultadoMotivacao = { enviado: boolean; motivo?: string; assunto?: string };

/**
 * Manda a próxima mensagem para os sócios ativos.
 *
 * Sem `forcar`, respeita o liga e desliga, a frequência e o "uma por dia": o
 * dia é reservado no banco ANTES do envio, numa única atualização com
 * condição, então duas chamadas ao mesmo tempo não mandam duas mensagens.
 * Com `forcar` (botão Enviar agora do painel), manda a próxima na hora.
 */
export async function enviarMotivacao(opcoes: { forcar?: boolean } = {}): Promise<ResultadoMotivacao> {
  const cfg = await lerMotivacao();
  if (!cfg.pronta) return { enviado: false, motivo: "A atualização do banco ainda não foi aplicada." };
  const hoje = hojeBrasil();
  if (!opcoes.forcar) {
    if (!cfg.ativa) return { enviado: false, motivo: "desligado" };
    if (!eDiaDeEnvio(cfg.frequencia, hoje.diaSemana)) return { enviado: false, motivo: "hoje não é dia de envio" };
  }

  const destinos = (
    await db.select({ email: socios.email }).from(socios).where(eq(socios.ativo, true))
  )
    .map((s) => s.email.trim())
    .filter((e) => e.includes("@"));
  if (destinos.length === 0) return { enviado: false, motivo: "Nenhum sócio ativo com e-mail no cadastro." };

  // Garante a linha de configuração e reserva o dia.
  await db.insert(motivacao).values({ id: "config" }).onConflictDoNothing();
  const n = MOTIVACOES.length;
  const reservada = await db
    .update(motivacao)
    .set({ ultimoEnvio: hoje.data, proxima: sql`(${motivacao.proxima} + 1) % ${n}`, updatedAt: new Date() })
    .where(
      opcoes.forcar
        ? eq(motivacao.id, "config")
        : and(eq(motivacao.id, "config"), or(isNull(motivacao.ultimoEnvio), ne(motivacao.ultimoEnvio, hoje.data))),
    )
    .returning({ proxima: motivacao.proxima });
  if (reservada.length === 0) return { enviado: false, motivo: "já foi enviada hoje" };

  const indice = (reservada[0].proxima - 1 + n) % n;
  const m = MOTIVACOES[indice];
  const respostas = (process.env.ORDER_NOTIFICATION_EMAIL ?? "").split(",")[0]?.trim();
  const r = await sendEmailDetailed({
    from: REMETENTE,
    to: destinos,
    subject: m.assunto,
    html: montarMotivacao(m, indice + 1),
    ...(respostas ? { replyTo: respostas } : {}),
  });

  if (!r.ok) {
    // Devolve a mensagem e o dia, para tentar de novo no próximo agendamento.
    await db
      .update(motivacao)
      .set({ proxima: indice, ultimoEnvio: cfg.ultimoEnvio, updatedAt: new Date() })
      .where(eq(motivacao.id, "config"));
    return { enviado: false, motivo: r.reason };
  }
  return { enviado: true, assunto: m.assunto };
}
