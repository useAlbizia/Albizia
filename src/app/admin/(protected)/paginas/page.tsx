import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { estaNoAr, listarPaginas } from "@/lib/paginas";
import { ExcluirPagina, FormPagina, Olho } from "./Componentes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Páginas especiais · Painel ALBIZIA" };

const dataBr = (d: string | null) => (d ? d.split("-").reverse().join("/") : "");

export default async function PaginasPage() {
  const [paginas, catalogo] = await Promise.all([
    listarPaginas(),
    db.select({ slug: products.slug, nome: products.name }).from(products).where(eq(products.active, true)).orderBy(asc(products.name)),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-sm uppercase tracking-[0.3em] text-content/60">Páginas especiais</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-content/70">
          Para datas comemorativas (Dia das Mães, Dia dos Pais, Black Friday, Natal): monte a página uma vez e use o{" "}
          <strong>olho</strong> para ligar e desligar no site, sem criar de novo. No ano seguinte, é só ajustar e ligar.
          Para o cliente chegar nela, coloque o link no Menu da loja, num banner ou no Instagram.
        </p>
      </div>

      {paginas.map((p) => {
        const noAr = estaNoAr(p);
        return (
          <section key={p.id} className="flex flex-col gap-4 border-[1.5px] border-content/30 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-medium">{p.titulo}</p>
                <p className="text-[12px] text-content/65">
                  {noAr ? "No ar agora" : p.ativo ? "Ligada, mas fora do período" : "Fora do ar"}
                  {(p.inicio || p.fim) && ` · período: ${dataBr(p.inicio) || "..."} a ${dataBr(p.fim) || "..."}`}
                </p>
                <Link href={`/especial/${p.slug}`} target="_blank" className="text-[13px] underline underline-offset-4">
                  usealbizia.com.br/especial/{p.slug} {noAr ? "" : "(prévia)"}
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                <Olho id={p.id} ativo={p.ativo} />
                <ExcluirPagina id={p.id} titulo={p.titulo} />
              </div>
            </div>
            <details>
              <summary className="btn-sec cursor-pointer list-none">Editar</summary>
              <div className="mt-3">
                <FormPagina {...p} catalogo={catalogo} />
              </div>
            </details>
          </section>
        );
      })}

      <section className="flex flex-col gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em]">Nova página</p>
        <FormPagina catalogo={catalogo} />
      </section>
    </div>
  );
}
