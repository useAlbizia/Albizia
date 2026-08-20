import { HomeHero } from "@/components/HomeHero";
import { getCollections } from "@/lib/products";

export default async function Home() {
  const collections = await getCollections();
  return <HomeHero collections={collections} />;
}
