import { getPaymentSettings, isTestCredential } from "@/lib/payments";
import { PagamentosForm } from "./PagamentosForm";

export const dynamic = "force-dynamic";

export default async function PagamentosPage() {
  const s = await getPaymentSettings();

  return (
    <div>
      <h1 className="mb-2 text-sm uppercase tracking-[0.3em] text-content/60">Pagamentos</h1>
      <p className="mb-8 max-w-2xl text-[12px] leading-relaxed text-content/40">
        Conecte a conta do Mercado Pago que vai receber as vendas. O Access Token fica guardado com
        segurança no servidor e nunca é exposto no site. Pegue as duas credenciais em
        mercadopago.com.br/developers, no menu Suas integrações, dentro da sua aplicação, em
        Credenciais de produção.
      </p>

      <PagamentosForm
        settings={{
          // Only the public key crosses to the browser. The access token never
          // leaves the server — the form receives a boolean, not the secret.
          publicKey: s.publicKey,
          hasToken: !!s.accessToken,
          isTest: isTestCredential(s.accessToken) || isTestCredential(s.publicKey),
        }}
      />
    </div>
  );
}
