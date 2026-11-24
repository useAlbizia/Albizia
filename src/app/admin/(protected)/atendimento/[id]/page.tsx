import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chamados, emailMensagens, orders } from "@/lib/db/schema";
import { MOTIVOS, STATUS, type EventoChamado, type Motivo, type StatusChamado } from "@/lib/chamados";
import { BotoesStatus, FormNota, FormResposta } from "../Componentes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Protocolo · Painel ALBIZIA" };

const quando = (d: Date | string) =>
  new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const ROTULO_EVENTO: Record<EventoChamado["tipo"], string> = {
  resposta: "Resposta enviada ao cliente",
  nota: "Anotação interna",
  status: "Situação",
};

export default async function ProtocoloPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await db.query.chamados.findFirst({ where: eq(chamados.id, id) });
  if (!c) notFound();

  const [pedido, emails] = await Promise.all([
    c.pedidoNumero
      ? db.query.orders.findFirst({ where: eq(orders.orderNumber, c.pedidoNumero), columns: { id: true, customerEmail: true } })
      : null,
    // O que o cliente mandou por e-mail depois de abrir (fotos, complemento):
    // resposta com o protocolo no assunto, ou qualquer e-mail dele desde então.
    db
      .select()
      .from(emailMensagens)
      .where(
        and(
          eq(emailMensagens.direcao, "in"),
          isNull(emailMensagens.excluidoEm),
          gte(emailMensagens.createdAt, c.criadoEm),
          or(ilike(emailMensagens.assunto, `%Protocolo nº ${c.numero}%`), ilike(emailMensagens.deEmail, c.email)),
        ),
      )
      .orderBy(asc(emailMensagens.createdAt))
      .limit(30),
  ]);

  const historico = (Array.isArray(c.historico) ? c.historico : []) as EventoChamado[];
  const [{ atrasado }] = await db
    .select({ atrasado: sql<boolean>`${chamados.status} <> 'resolvido' and ${chamados.prazoEm} < now()` })
    .from(chamados)
    .where(eq(chamados.id, id));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/admin/atendimento" className="text-[12px] text-content/60 underline underline-offset-2">
        ← Atendimento
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-lg tracking-wide">Protocolo nº {c.numero}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="bg-content px-2 py-0.5 text-surface">{STATUS[c.status as StatusChamado] ?? c.status}</span>
          {atrasado && <span className="bg-red-600 px-2 py-0.5 text-white">Prazo vencido</span>}
          <span className="text-content/60">
            Aberto em {quando(c.criadoEm)} pelo {c.origem === "chat" ? "chat" : "site"} · responder até {quando(c.prazoEm)}
            {c.resolvidoEm ? ` · resolvido em ${quando(c.resolvidoEm)}` : ""}
          </span>
        </div>
        <BotoesStatus id={c.id} atual={c.status as StatusChamado} />
      </div>

      <section className="flex flex-col gap-1 border border-content/15 p-4 text-[14px]">
        <p>
          <strong>{c.nome}</strong> · <a href={`mailto:${c.email}`} className="underline underline-offset-2">{c.email}</a>
          {c.telefone ? ` · ${c.telefone}` : ""}
        </p>
        <p className="text-content/70">
          {MOTIVOS[c.motivo as Motivo] ?? c.motivo}
          {c.pedidoNumero ? (
            <>
              {" · "}
              {pedido ? (
                <Link href={`/admin/pedidos/${pedido.id}`} className="underline underline-offset-2">
                  Pedido nº {c.pedidoNumero}
                </Link>
              ) : (
                `Pedido nº ${c.pedidoNumero} (não encontrado)`
              )}
              {pedido && pedido.customerEmail.toLowerCase() !== c.email.toLowerCase() && (
                <span className="text-red-700"> · e-mail diferente do pedido</span>
              )}
            </>
          ) : null}
        </p>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed">{c.mensagem}</p>
      </section>

      {c.conversa && (
        <details className="border border-content/15 p-4 text-[13px]">
          <summary className="cursor-pointer text-content/70">Conversa com a Albi antes de abrir</summary>
          <p className="mt-3 whitespace-pre-wrap leading-relaxed text-content/80">{c.conversa}</p>
        </details>
      )}

      {emails.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-content/60">E-mails do cliente depois de abrir</h2>
          {emails.map((e) => (
            <Link key={e.id} href={`/admin/emails?id=${e.id}`} className="border border-content/15 px-4 py-3 text-[13px] hover:bg-content/5">
              <span className="text-content/50">{quando(e.createdAt)} · </span>
              {e.assunto || "(sem assunto)"}
              {Array.isArray(e.anexos) && e.anexos.length > 0 ? ` · ${e.anexos.length} anexo(s)` : ""}
            </Link>
          ))}
        </section>
      )}

      {historico.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] uppercase tracking-[0.15em] text-content/60">Histórico</h2>
          <ol className="flex flex-col gap-2">
            {historico.map((h, i) => (
              <li key={i} className={`border-l-2 pl-3 text-[13px] ${h.tipo === "nota" ? "border-yellow-500" : "border-content/30"}`}>
                <p className="text-content/50">
                  {quando(h.quando)} · {ROTULO_EVENTO[h.tipo] ?? h.tipo} · {h.quem}
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{h.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <FormResposta id={c.id} nome={c.nome} />
      <FormNota id={c.id} />
    </div>
  );
}
