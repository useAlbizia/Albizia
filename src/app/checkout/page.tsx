import { getShippingConfig } from "@/lib/shipping";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = { title: "Checkout — ALBIZIA" };

export default async function CheckoutPage() {
  const shipping = await getShippingConfig();
  return <CheckoutClient shipping={shipping} />;
}
