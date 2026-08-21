import { HomeHero } from "@/components/HomeHero";
import { getCollections, getFeaturedProducts } from "@/lib/products";

export default async function Home() {
  const [collections, featured] = await Promise.all([
    getCollections(),
    getFeaturedProducts(6),
  ]);
  return <HomeHero collections={collections} featured={featured} />;
}
