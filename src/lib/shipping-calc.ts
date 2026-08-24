// Pure shipping math — no DB, so it's safe to import in client components
// (the checkout previews the same number the server will charge).

export type ShippingConfig = {
  flatCents: number;
  freeThresholdCents: number;
};

export function computeShipping(
  subtotalCents: number,
  config: ShippingConfig,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for a future carrier-API (rates by CEP)
  cep?: string
): number {
  if (config.flatCents <= 0) return 0; // free shipping mode
  if (config.freeThresholdCents > 0 && subtotalCents >= config.freeThresholdCents) return 0;
  return config.flatCents;
}
