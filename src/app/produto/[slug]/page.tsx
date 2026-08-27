import { notFound } from "next/navigation";
import { getAllProductSlugs, getProductBySlug, getColorSiblings } from "@/lib/products";
import { getProductReviews } from "@/lib/reviews";
import { ProductDetail } from "@/components/ProductDetail";
import { Stars } from "@/components/Stars";
import { shortDate } from "@/lib/format";
import { ReviewForm } from "./ReviewForm";

// ISR: keep the page static (fast) but refresh approved reviews periodically.
export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  return { title: product ? `${product.name} · ALBIZIA` : "ALBIZIA" };
}

export default async function ProdutoPage(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [reviews, colorOptions] = await Promise.all([
    getProductReviews(product.id),
    getColorSiblings(product.colorGroup),
  ]);

  return (
    <>
      <ProductDetail product={product} colorOptions={colorOptions} />

      <section className="mx-auto max-w-6xl border-t border-content/10 px-6 py-16">
        <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-sm uppercase tracking-[0.3em] text-content/60">Avaliações</h2>
          {reviews.count > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <Stars value={reviews.average} className="text-lg tracking-widest text-content" />
              <span className="text-content/70">{reviews.average.toFixed(1)} / 5</span>
              <span className="text-content/40">
                ({reviews.count} avaliaç{reviews.count > 1 ? "ões" : "ão"})
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            {reviews.count === 0 ? (
              <p className="text-sm text-content/50">
                Ainda não há avaliações. Seja o primeiro a avaliar esta peça.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-content/10">
                {reviews.items.map((r) => (
                  <div key={r.id} className="py-5 first:pt-0">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} className="tracking-widest text-content" />
                      <span className="text-[12px] text-content/40">{shortDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-content/80">{r.authorName}</p>
                    {r.comment && (
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-content/60">
                        {r.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-4 text-[11px] uppercase tracking-[0.2em] text-content/50">
              Deixe sua avaliação
            </h3>
            <ReviewForm productId={product.id} />
          </div>
        </div>
      </section>
    </>
  );
}
