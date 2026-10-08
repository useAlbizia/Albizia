import {
  faltaParaEtiqueta,
  getShippingSettings,
  listarServicosMe,
  servicosValidos,
  tokenVemDoAmbiente,
} from "@/lib/shipping";
import { FreteForm } from "./FreteForm";

export const dynamic = "force-dynamic";

export default async function FretePage() {
  const s = await getShippingSettings();
  const servicos = await listarServicosMe(s);
  const ativos = servicosValidos(s.meServices).split(",").filter(Boolean).map(Number);

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
          tokenNoAmbiente: tokenVemDoAmbiente(s.meEnvironment),
          meEnvironment: s.meEnvironment,
          meWeight: s.meWeightGrams,
          meLength: s.meLengthCm,
          meWidth: s.meWidthCm,
          meHeight: s.meHeightCm,
          meFromName: s.meFrom.name,
          meFromDocument: s.meFrom.companyDocument ?? "",
          meFromPhone: s.meFrom.phone,
          meFromEmail: s.meFrom.email,
          meFromAddress: s.meFrom.address,
          meFromNumber: s.meFrom.number,
          meFromComplement: s.meFrom.complement,
          meFromDistrict: s.meFrom.district,
          meFromCity: s.meFrom.city,
          meFromState: s.meFrom.stateAbbr,
          falta: faltaParaEtiqueta(s),
          servicos,
          servicosAtivos: ativos,
        }}
      />
    </div>
  );
}
