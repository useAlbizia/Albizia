import { getShippingConfig } from "@/lib/shipping";
import { CarrinhoClient } from "./CarrinhoClient";

export const metadata = { title: "Carrinho · ALBIZIA" };

export default async function CarrinhoPage() {
  const shipping = await getShippingConfig();
  return <CarrinhoClient shipping={shipping} />;
}
