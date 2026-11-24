import Link from "next/link";
import { desc, getTableColumns, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chamados } from "@/lib/db/schema";
import { MOTIVOS, prazoEmDias, STATUS, type Motivo, type StatusChamado } from "@/lib/chamados";
import { FormPrazo } from "./Componentes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Atendimento · Painel ALBIZIA" };

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function AtendimentoAdmin(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await props.searchParams;
  const todos = sp.todos === "1";
  const [lista, dias] = await Promise.all([
    db
      .select({
        ...getTableColumns(chamados),
        // Calculado no banco: "agora" fica fora do componente.
        atrasado: sql<boolean>`${chamados.status} <> 'resolvido' and ${chamados.prazoEm} < now()`,
      })
      .from(chamados)
      .where(todos ? undefined : ne(chamados.status, "resolvido"))
      .orderBy(todos ? desc(chamados.criadoEm) : chamados.prazoEm)
      .limit(300),
    prazoEmDias(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Atendimento</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Protocolos que os clientes abrem pelo site ou pelo chat, quando a Albi encaminha. A equipe recebe aviso por
          e-mail e no celular quando um chega e, enquanto houver protocolo vencido sem solução, recebe cobrança todo dia de
          manhã. Responda por aqui: o cliente recebe por e-mail e, se ele responder, a mensagem cai em E-mails.
        </p>
      </div>

      <FormPrazo dias={dias} />

      <div className="flex gap-2">
        <Link href="/admin/atendimento" className={!todos ? "bg-content px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-surface" : "btn-sec min-h-0! px-3! py-1.5!"}>
          Em aberto
        </Link>
        <Link href="/admin/atendimento?todos=1" className={todos ? "bg-content px-3 py-1.5 text-[12px] uppercase tracking-[0.1em] text-surface" : "btn-sec min-h-0! px-3! py-1.5!"}>
          Todos
        </Link>
      </div>

      {lista.length === 0 && (
        <p className="py-8 text-center text-[14px] text-content/60">
          {todos ? "Nenhum protocolo aberto até agora." : "Nenhum protocolo esperando resposta."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {lista.map((c) => {
          const atrasado = c.atrasado;
          return (
            <li key={c.id}>
              <Link
                href={`/admin/atendimento/${c.id}`}
                className={`flex flex-col gap-1 border px-4 py-3 transition-colors hover:bg-content/5 ${atrasado ? "border-red-600" : "border-content/15"}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className="font-medium">nº {c.numero}</span>
                  <span className={`px-2 py-0.5 text-[11px] ${c.status === "resolvido" ? "bg-content/10" : c.status === "andamento" ? "bg-content/20" : "bg-content text-surface"}`}>
                    {STATUS[c.status as StatusChamado] ?? c.status}
                  </span>
                  {atrasado && <span className="bg-red-600 px-2 py-0.5 text-[11px] text-white">Prazo vencido</span>}
                  <span className="text-content/50">{quando(c.criadoEm)}</span>
                  {c.origem === "chat" && <span className="text-content/50">· pelo chat</span>}
                </div>
                <p className="text-[14px]">
                  {c.nome} · {MOTIVOS[c.motivo as Motivo] ?? c.motivo}
                  {c.pedidoNumero ? ` · Pedido nº ${c.pedidoNumero}` : ""}
                </p>
                <p className="line-clamp-2 text-[13px] text-content/60">{c.mensagem}</p>
                {c.status !== "resolvido" && (
                  <p className={`text-[12px] ${atrasado ? "text-red-700" : "text-content/50"}`}>Responder até {quando(c.prazoEm)}</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
