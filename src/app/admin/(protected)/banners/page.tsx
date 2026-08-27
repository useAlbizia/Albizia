import { asc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { banners } from "@/lib/db/schema";
import { AddBannerForm, BannerEditor } from "./BannerForms";

export const dynamic = "force-dynamic";

export default async function BannersPage() {
  const items = await db.query.banners.findMany({ orderBy: [asc(banners.sortOrder)] });

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Banners da home</h1>
      <p className="mb-8 max-w-2xl text-[12px] text-content/40">
        Banners ativos viram o carrossel do topo da home (substituem a animação do símbolo). Imagem
        larga recomendada (ex: 1920×1080). Você pode adicionar título, subtítulo e botão sobre a
        imagem.
      </p>

      <div className="mb-8">
        <AddBannerForm />
      </div>

      <div className="flex flex-col gap-4">
        {items.map((b) => (
          <BannerEditor key={b.id} banner={b} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-content/50">
          Nenhum banner ainda — a home usa a animação do símbolo.
        </p>
      )}
    </div>
  );
}
