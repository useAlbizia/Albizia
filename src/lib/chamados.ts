import "server-only";
import { and, asc, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "./db/client";
import { chamados, emailMensagens, siteSettings } from "./db/schema";
import { emailButton, emailShell, esc, sendEmail, sendEmailDetailed, SITE } from "./email";
import { emailsDaEquipe } from "./destinatarios";
import { enviarPush } from "./push";

// Protocolos de atendimento.
//
// O cliente abre pelo site (/atendimento) ou pelo chat, quando a Albi chega
// ao limite do que dá para resolver conversando. Ele recebe o número do
// protocolo e o prazo por e-mail; a equipe recebe o aviso na hora (e-mail e
// notificação no celular), vê tudo em Painel > Atendimento e, enquanto houver
// protocolo vencido sem solução, recebe cobrança todo dia.

export const MOTIVOS = {
  produto: "Problema com a peça (defeito, avaria ou peça errada)",
  troca: "Troca ou devolução",
  entrega: "Entrega (atraso, extravio ou endereço)",
  pagamento: "Pagamento ou reembolso",
  outro: "Outro assunto",
} as const;
export type Motivo = keyof typeof MOTIVOS;

export const STATUS = {
  aberto: "Aberto",
  andamento: "Em andamento",
  resolvido: "Resolvido",
} as const;
export type StatusChamado = keyof typeof STATUS;

export type EventoChamado = {
  quando: string;
  quem: string;
  tipo: "resposta" | "nota" | "status";
  texto: string;
};

// Respostas saem da caixa de contato: se o cliente responder o e-mail, a
// resposta cai em Painel > E-mails, com o número do protocolo no assunto.
export const CONTATO = process.env.EMAIL_CONTATO ?? "ALBIZIA <contato@usealbizia.com.br>";

export function protocolo(numero: number): string {
  return `Protocolo nº ${numero}`;
}

/** Soma dias úteis (pula sábado e domingo). */
export function somarDiasUteis(inicio: Date, dias: number): Date {
  const d = new Date(inicio);
  let faltam = Math.max(1, dias);
  while (faltam > 0) {
    d.setDate(d.getDate() + 1);
    const semana = d.getDay();
    if (semana !== 0 && semana !== 6) faltam--;
  }
  return d;
}

export async function prazoEmDias(): Promise<number> {
  const [r] = await db
    .select({ dias: siteSettings.atendimentoPrazoDias })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .catch(() => []);
  return r?.dias ?? 2;
}

export function dataCurta(d: Date): string {
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });
}

const p = (t: string) => `<p style="font-size:14px;line-height:1.7;color:#55534e;margin:0 0 14px;">${t}</p>`;
const citacao = (t: string) =>
  `<div style="border-left:2px solid #e6e0d5;padding:4px 0 4px 14px;margin:6px 0 18px;font-size:14px;line-height:1.7;color:#55534e;white-space:pre-wrap;">${esc(t)}</div>`;

export type NovoChamado = {
  nome: string;
  email: string;
  telefone: string;
  pedidoNumero: number | null;
  motivo: Motivo;
  mensagem: string;
  conversa: string;
  origem: "site" | "chat";
};

export async function criarChamado(dados: NovoChamado): Promise<{ numero: number; prazoEm: Date }> {
  const prazoEm = somarDiasUteis(new Date(), await prazoEmDias());
  const [c] = await db
    .insert(chamados)
    .values({ ...dados, prazoEm })
    .returning({ id: chamados.id, numero: chamados.numero });

  const assunto = `${protocolo(c.numero)}: recebemos sua solicitação`;
  const primeiroNome = dados.nome.split(/\s+/)[0];

  // Para o cliente: número, prazo e cópia do que ele escreveu.
  await sendEmail({
    from: CONTATO,
    replyTo: CONTATO,
    to: dados.email,
    subject: assunto,
    html: emailShell(
      protocolo(c.numero),
      `${p(`Olá, ${esc(primeiroNome)}. Recebemos sua solicitação e ela já está com a nossa equipe.`)}
       ${p(`Seu protocolo é o <strong style="color:#121212;">nº ${c.numero}</strong>. Vamos responder por este e-mail até <strong style="color:#121212;">${esc(dataCurta(prazoEm))}</strong>.`)}
       ${p(`Assunto: ${esc(MOTIVOS[dados.motivo])}${dados.pedidoNumero ? ` · Pedido nº ${dados.pedidoNumero}` : ""}`)}
       ${citacao(dados.mensagem)}
       ${p("Se quiser acrescentar alguma informação ou fotos, é só responder este e-mail.")}`,
    ),
  });

  // Para a equipe: na hora, por e-mail e no celular.
  const equipe = await emailsDaEquipe();
  if (equipe.length) {
    await sendEmail({
      to: equipe,
      replyTo: dados.email,
      subject: `Novo ${protocolo(c.numero)}: ${MOTIVOS[dados.motivo]}`,
      html: emailShell(
        `Novo atendimento · nº ${c.numero}`,
        `${p(`<strong style="color:#121212;">${esc(dados.nome)}</strong> · ${esc(dados.email)}${dados.telefone ? ` · ${esc(dados.telefone)}` : ""}`)}
         ${p(`${esc(MOTIVOS[dados.motivo])}${dados.pedidoNumero ? ` · Pedido nº ${dados.pedidoNumero}` : ""} · aberto pelo ${dados.origem === "chat" ? "chat" : "site"}`)}
         ${citacao(dados.mensagem)}
         ${p(`Prazo para responder: <strong style="color:#121212;">${esc(dataCurta(prazoEm))}</strong>.`)}
         ${emailButton("Abrir no painel", `${SITE}/admin/atendimento/${c.id}`)}`,
      ),
    });
    await enviarPush(equipe, {
      titulo: `Novo atendimento nº ${c.numero}`,
      corpo: `${dados.nome}: ${MOTIVOS[dados.motivo]}`,
      url: `/admin/atendimento/${c.id}`,
      tag: `chamado-${c.numero}`,
    }).catch(() => 0);
  }

  return { numero: c.numero, prazoEm };
}

/** Resposta da equipe ao cliente, pelo e-mail de contato. */
export async function enviarResposta(
  c: { numero: number; nome: string; email: string },
  texto: string,
  quem: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const assunto = `${protocolo(c.numero)}: resposta da ALBIZIA`;
  const r = await sendEmailDetailed({
    from: CONTATO,
    replyTo: CONTATO,
    to: c.email,
    subject: assunto,
    text: texto,
    html: emailShell(
      protocolo(c.numero),
      `${p(`Olá, ${esc(c.nome.split(/\s+/)[0])}.`)}
       <div style="font-size:14px;line-height:1.7;color:#55534e;white-space:pre-wrap;margin:0 0 18px;">${esc(texto)}</div>
       ${p("Se precisar de algo mais, é só responder este e-mail.")}`,
    ),
  });
  if (!r.ok) return r;
  // Fica também na caixa de E-mails, junto com o que o cliente responder.
  await db
    .insert(emailMensagens)
    .values({
      direcao: "out",
      resendId: r.id ?? null,
      deEmail: CONTATO.replace(/^.*<([^>]+)>.*$/, "$1"),
      deNome: "ALBIZIA",
      paraEmail: c.email,
      assunto,
      texto,
      lido: true,
      enviadoPor: quem,
    })
    .catch(() => {});
  return { ok: true };
}

/** Número no menu do painel: em aberto, e quantos já passaram do prazo. */
export async function contarChamados(): Promise<{ abertos: number; atrasados: number }> {
  try {
    const [r] = await db
      .select({
        abertos: sql<number>`count(*)::int`,
        atrasados: sql<number>`count(*) filter (where ${chamados.prazoEm} < now())::int`,
      })
      .from(chamados)
      .where(ne(chamados.status, "resolvido"));
    return { abertos: r?.abertos ?? 0, atrasados: r?.atrasados ?? 0 };
  } catch {
    return { abertos: 0, atrasados: 0 };
  }
}

/**
 * Cobrança diária (roda no agendamento da manhã): enquanto houver protocolo
 * vencido sem solução, a equipe recebe a lista por e-mail e no celular.
 */
export async function cobrarChamadosVencidos(): Promise<number> {
  const vencidos = await db
    .select()
    .from(chamados)
    .where(and(ne(chamados.status, "resolvido"), lt(chamados.prazoEm, new Date())))
    .orderBy(asc(chamados.prazoEm));
  if (vencidos.length === 0) return 0;

  const equipe = await emailsDaEquipe();
  if (equipe.length === 0) return vencidos.length;

  const dias = (d: Date) => Math.max(1, Math.floor((Date.now() - d.getTime()) / 86400_000));
  const linhas = vencidos
    .map(
      (c) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;"><a href="${SITE}/admin/atendimento/${c.id}" style="color:#121212;">nº ${c.numero}</a></td>
        <td style="padding:8px 6px;border-bottom:1px solid #eee;color:#55534e;">${esc(c.nome)} · ${esc(MOTIVOS[c.motivo as Motivo] ?? c.motivo)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;color:#b91c1c;white-space:nowrap;">${dias(c.prazoEm)} dia(s)</td>
      </tr>`,
    )
    .join("");

  await sendEmail({
    to: equipe,
    subject: `${vencidos.length} atendimento(s) passaram do prazo e não foram resolvidos`,
    html: emailShell(
      "Atendimento atrasado",
      `${p("Estes clientes estão esperando resposta além do prazo prometido. Responda ou marque como resolvido no painel.")}
       <table style="width:100%;border-collapse:collapse;font-size:14px;">
         <tr><td style="color:#8a857c;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Protocolo</td><td></td>
         <td style="text-align:right;color:#8a857c;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Atraso</td></tr>
         ${linhas}
       </table>
       ${emailButton("Abrir atendimento", `${SITE}/admin/atendimento`)}`,
    ),
  });
  await enviarPush(equipe, {
    titulo: "Atendimento atrasado",
    corpo: `${vencidos.length} protocolo(s) passaram do prazo sem solução.`,
    url: "/admin/atendimento",
    tag: "chamados-atrasados",
  }).catch(() => 0);
  return vencidos.length;
}
