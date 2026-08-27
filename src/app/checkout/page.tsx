import { getShippingSettings } from "@/lib/shipping";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = { title: "Checkout · ALBIZIA" };

export default async function CheckoutPage() {
  const s = await getShippingSettings();
  // Only the non-secret bits reach the client (never the Melhor Envio token).
  return (
    <CheckoutClient
      method={s.method}
      shipping={{ flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents }}
    />
  );
}
