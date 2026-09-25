import { getShippingSettings } from "@/lib/shipping";
import { getPaymentPublicKey } from "@/lib/payments";
import { CheckoutClient } from "./CheckoutClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout · ALBIZIA" };

export default async function CheckoutPage() {
  const [s, publicKey] = await Promise.all([getShippingSettings(), getPaymentPublicKey()]);
  // Only the non-secret bits reach the client: never the Melhor Envio token,
  // never the Mercado Pago access token. The public key is public by design.
  return (
    <CheckoutClient
      method={s.method}
      shipping={{ flatCents: s.flatCents, freeThresholdCents: s.freeThresholdCents }}
      publicKey={publicKey}
    />
  );
}
