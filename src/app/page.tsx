import { HomeHero } from "@/components/HomeHero";
import { HeroBanners } from "@/components/HeroBanners";
import { IntroAlbizia } from "@/components/IntroAlbizia";
import { getCollections, getFeaturedProducts } from "@/lib/products";
import { getActiveBanners } from "@/lib/banners";
import { getSiteSettings } from "@/lib/settings";

export default async function Home() {
  const [collections, featured, banners, settings] = await Promise.all([
    getCollections(),
    getFeaturedProducts(6),
    getActiveBanners(),
    getSiteSettings(),
  ]);
  return (
    <>
      {/* Só na home: quem chega por um link de produto veio ver o produto,
          e uma abertura no caminho seria só espera. */}
      {settings.introEnabled && <IntroAlbizia />}
      <HeroBanners
        banners={banners}
        brandSlide={settings.brandSlideEnabled ? settings.brandSlidePosition : null}
      />
      <HomeHero collections={collections} featured={featured} />
    </>
  );
}
