import { HomeHero } from "@/components/HomeHero";
import { HeroBanners } from "@/components/HeroBanners";
import { getCollections, getFeaturedProducts } from "@/lib/products";
import { getActiveBanners } from "@/lib/banners";

export default async function Home() {
  const [collections, featured, banners] = await Promise.all([
    getCollections(),
    getFeaturedProducts(6),
    getActiveBanners(),
  ]);
  return (
    <>
      <HeroBanners banners={banners} />
      <HomeHero collections={collections} featured={featured} hideHero={banners.length > 0} />
    </>
  );
}
