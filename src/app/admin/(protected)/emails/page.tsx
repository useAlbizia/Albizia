import Link from "next/link";
import { dateTime } from "@/lib/format";
import { abrirEmail, contarNaoLidos, limparLixeiraAntiga, listarEmails, PASTAS, type Pasta } from "@/lib/emails";
import { AcoesEmail, Anexos, CorpoEmail, Escrever, EsvaziarLixeira } from "./Componentes";

export const dynamic = "force-dynamic";
export const metadata = { title: "E-mails · Painel ALBIZIA" };

const NOME_PASTA: Record<Pasta, string> = {
  entrada: "Entrada",
  importantes: "Importantes",
  enviados: "Enviados",
  arquivados: "Arquivados",
  spam: "Spam",
  lixeira: "Lixeira",
};

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function EmailsPage(props: PageProps<"/admin/emails">) {
  const sp = await props.searchParams;
  const pasta = (PASTAS as readonly string[]).includes(um(sp.pasta)) ? (um(sp.pasta) as Pasta) : "entrada";
  const busca = um(sp.q);
  const id = um(sp.id);
  const novo = um(sp.novo) === "1";

  await limparLixeiraAntiga().catch(() => {});
  const [lista, aberto, naoLidos] = await Promise.all([
    listarEmails(pasta, busca),
    id ? abrirEmail(id) : Promise.resolve(null),
    contarNaoLidos(),
  ]);
  const anexos = (aberto?.anexos ?? []) as { id: string; nome: string; tamanho: number | null }[];
  const lendo = !!aberto || novo;
  const assuntoResposta = aberto ? (/^re:/i.test(aberto.assunto) ? aberto.assunto : `Re: ${aberto.assunto}`) : "";
  const link = (extra: Record<string, string>) =>
    `/admin/emails?${new URLSearchParams({ pasta, ...(busca ? { q: busca } : {}), ...extra }).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">E-mails</h1>
        <Link
          href={link({ novo: "1" })}
          className="border border-content bg-content px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-surface"
        >
          Escrever
        </Link>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {PASTAS.map((p) => (
          <Link
            key={p}
            href={`/admin/emails?pasta=${p}`}
            className={`shrink-0 px-3 py-1.5 text-[12px] ${p === pasta ? "border-b-2 border-content" : "text-content/55 hover:text-content"}`}
          >
            {NOME_PASTA[p]}
            {p === "entrada" && naoLidos > 0 && <span className="ml-1.5 text-[11px]">({naoLidos})</span>}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* No celular, abrir um e-mail esconde a lista; no computador, as duas ficam lado a lado. */}
        <section className={lendo ? "hidden lg:block" : ""}>
          <form className="mb-3 flex gap-2">
            <input type="hidden" name="pasta" value={pasta} />
            <input
              name="q"
              defaultValue={busca}
              placeholder="Buscar por nome, e-mail ou assunto"
              className="flex-1 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
            />
          </form>
          {pasta === "lixeira" && lista.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-content/45">
              <span>Itens com mais de 30 dias são apagados sozinhos.</span>
              <EsvaziarLixeira />
            </div>
          )}
          <ul className="divide-y divide-content/10 border-y border-content/10">
            {lista.map((m) => {
              const quem = m.direcao === "in" ? m.deNome || m.deEmail : `Para: ${m.paraEmail}`;
              return (
                <li key={m.id}>
                  <Link href={link({ id: m.id })} className={`block px-2 py-3 hover:bg-content/[0.03] ${m.id === id ? "bg-content/[0.05]" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${m.lido ? "text-content/70" : "font-medium"}`}>
                        {m.importante && "★ "}
                        {quem}
                      </span>
                      <span className="shrink-0 text-[11px] text-content/40">{dateTime(m.createdAt)}</span>
                    </div>
                    <p className={`truncate text-[13px] ${m.lido ? "text-content/60" : "text-content"}`}>{m.assunto || "(sem assunto)"}</p>
                    <p className="truncate text-[12px] text-content/40">{m.resumo}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
          {lista.length === 0 && (
            <p className="py-10 text-center text-sm text-content/45">
              {busca ? "Nada encontrado." : pasta === "entrada" ? "Nenhum e-mail na entrada." : "Pasta vazia."}
            </p>
          )}
        </section>

        <section className={lendo ? "" : "hidden lg:block"}>
          {novo && !aberto && (
            <div className="flex flex-col gap-3">
              <Link href={link({})} className="text-[12px] text-content/50 hover:text-content lg:hidden">
                ‹ Voltar
              </Link>
              <p className="text-[11px] uppercase tracking-[0.2em] text-content/60">Novo e-mail</p>
              <Escrever />
            </div>
          )}

          {aberto && (
            <article className="flex flex-col gap-4">
              <Link href={link({})} className="text-[12px] text-content/50 hover:text-content lg:hidden">
                ‹ Voltar
              </Link>
              <div>
                <h2 className="text-lg">{aberto.assunto || "(sem assunto)"}</h2>
                <p className="mt-1 text-[13px] text-content/65">
                  {aberto.direcao === "in" ? (
                    <>
                      De <strong>{aberto.deNome ?? aberto.deEmail}</strong> &lt;{aberto.deEmail}&gt;
                    </>
                  ) : (
                    <>
                      Para <strong>{aberto.paraEmail}</strong>
                      {aberto.enviadoPor && <span className="text-content/45"> · enviado por {aberto.enviadoPor}</span>}
                    </>
                  )}
                </p>
                <p className="text-[12px] text-content/40">{dateTime(aberto.createdAt)}</p>
              </div>

              {aberto.spam && (
                <p className="border border-content/30 px-3 py-2 text-[12px] text-content/75">
                  O filtro marcou este e-mail como spam ou vírus. Não abra anexos nem clique em links se não
                  reconhecer quem mandou.
                </p>
              )}

              <AcoesEmail
                id={aberto.id}
                importante={aberto.importante}
                arquivado={aberto.arquivado}
                spam={aberto.spam}
                naLixeira={!!aberto.excluidoEm}
                recebido={aberto.direcao === "in"}
              />

              <CorpoEmail html={aberto.html} texto={aberto.texto} />
              <Anexos mensagemId={aberto.id} anexos={anexos} />

              {aberto.direcao === "in" && !aberto.excluidoEm && (
                <div className="mt-4 border-t border-content/10 pt-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-content/60">Responder</p>
                  <Escrever para={aberto.deEmail} assunto={assuntoResposta} respondendoA={aberto.id} />
                </div>
              )}
            </article>
          )}

          {!lendo && (
            <p className="py-20 text-center text-sm text-content/40">Escolha um e-mail para ler.</p>
          )}
        </section>
      </div>
    </div>
  );
}
