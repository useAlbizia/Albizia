import { getShippingSettings } from "@/lib/shipping";
import { FreteForm } from "./FreteForm";

export const dynamic = "force-dynamic";

export default async function FretePage() {
  const s = await getShippingSettings();

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Frete</h1>
      <p className="mb-8 max-w-2xl text-[12px] text-content/40">
        Escolha entre um frete fixo ou cotação em tempo real pelo Melhor Envio (Correios, Jadlog e
        outras transportadoras, por CEP). O token do Melhor Envio fica guardado com segurança e
        nunca é exposto no site.
      </p>

      <FreteForm
        settings={{
          method: s.method,
          flatReais: (s.flatCents / 100).toFixed(2),
          freeThresholdReais: (s.freeThresholdCents / 100).toFixed(2),
          meFromCep: s.meFromCep,
          hasToken: !!s.meToken,
          meWeight: s.meWeightGrams,
          meLength: s.meLengthCm,
          meWidth: s.meWidthCm,
          meHeight: s.meHeightCm,
        }}
      />
    </div>
  );
}
