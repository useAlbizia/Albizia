import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductsBySlugs } from "@/lib/products";
import { estaNoAr, paginaPorSlug } from "@/lib/paginas";
import { ProductCover } from "@/components/ProductImage";
import { getAdminUser } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const p = await paginaPorSlug(slug);
  return { title: p ? `${p.titulo} · ALBIZIA` : "ALBIZIA" };
}

// Página especial (datas comemorativas). Fora do ar, o cliente vê "não
// encontrada"; quem administra vê mesmo assim, com uma faixa avisando, para
// conferir antes de ligar.
export default async function PaginaEspecialPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const pagina = await paginaPorSlug(slug);
  if (!pagina) notFound();
  const noAr = estaNoAr(pagina);
  const admin = noAr ? null : await getAdminUser().catch(() => null);
  if (!noAr && !admin) notFound();

  const produtos = pagina.produtos.length ? await getProductsBySlugs(pagina.produtos) : [];
  // Mantém a ordem escolhida no painel.
  const ordenados = pagina.produtos.map((s) => produtos.find((p) => p.slug === s)).filter((p) => !!p);

  return (
    <>
      {!noAr && (
        <div className="bg-content px-4 py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-surface">
          Prévia: esta página está fora do ar. Só quem administra vê.{" "}
          <Link href="/admin/paginas" className="underline underline-offset-4">
            Voltar ao painel
          </Link>
        </div>
      )}

      {pagina.imagemUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pagina.imagemUrl} alt={pagina.titulo} className="aspect-[16/9] max-h-[70vh] w-full object-cover" />
      )}

      <section className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h1 className="text-2xl uppercase tracking-[0.25em] sm:text-3xl">{pagina.titulo}</h1>
        {pagina.subtitulo && <p className="mt-3 text-sm uppercase tracking-[0.2em] text-content/60">{pagina.subtitulo}</p>}
        {pagina.texto && (
          <p className="mx-auto mt-6 max-w-2xl whitespace-pre-line text-[15px] leading-relaxed text-content/75">{pagina.texto}</p>
        )}
      </section>

      {ordenados.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {ordenados.map((product) => (
              <Link key={product!.slug} href={`/produto/${product!.slug}`} className="group block">
                <ProductCover name={product!.name} images={product!.images} role="studio" className="aspect-[4/5] w-full" />
                <h2 className="mt-3 text-[13px] uppercase tracking-[0.1em] text-content/80 group-hover:text-content">
                  {product!.name}
                </h2>
                <p className="mt-1 text-sm text-content/50">
                  {product!.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
