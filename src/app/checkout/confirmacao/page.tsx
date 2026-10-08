import Link from "next/link";
import { Symbol } from "@/components/logo/Symbol";
import { getOrderReceipt } from "@/lib/orders";
import { LimparCarrinho } from "./LimparCarrinho";

export const metadata = { title: "Pedido recebido · ALBIZIA" };
export const dynamic = "force-dynamic";

export default async function ConfirmacaoPage(props: PageProps<"/checkout/confirmacao">) {
  const sp = await props.searchParams;
  const id = Array.isArray(sp.order) ? sp.order[0] : sp.order;
  const recibo = id ? await getOrderReceipt(id) : null;

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <LimparCarrinho />

      <Symbol className="h-10 w-10" />
      <h1 className="mt-8 text-sm uppercase tracking-[0.3em] text-content/60">Pedido recebido</h1>

      {recibo && (
        <>
          {/* O número grande é o que salva quem digitou o e-mail errado: sem
              ele a pessoa fecha a página e não tem o que falar ao pedir ajuda. */}
          <p className="mt-6 text-3xl">Pedido #{recibo.orderNumber}</p>
          <p className="mt-2 text-[12px] uppercase tracking-[0.15em] text-content/40">
            Anote esse número
          </p>
        </>
      )}

      <p className="mt-6 max-w-sm text-sm leading-relaxed text-content/60">
        Assim que o pagamento for confirmado pelo Mercado Pago, você recebe a atualização por
        e-mail.
      </p>

      {recibo && (
        <div className="mt-5 w-full max-w-sm border border-content/15 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-content/40">
            Enviaremos para
          </p>
          {/* O e-mail isolado numa linha é onde a pessoa enxerga o próprio
              erro de digitação. Dentro do formulário ela já parou de olhar. */}
          <p className="mt-1 break-all text-sm">{recibo.customerEmail}</p>
          <p className="mt-2 text-[11px] leading-relaxed text-content/40">
            Não é esse endereço? Fale com a gente pelo WhatsApp com o número do pedido acima que a
            gente corrige.
          </p>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href={recibo?.trackUrl ?? "/acompanhar"}
          className="border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
        >
          Acompanhar pedido
        </Link>
        <Link
          href="/colecoes"
          className="border border-content/30 px-8 py-3 text-[13px] uppercase tracking-[0.2em] text-content/70 transition-colors hover:border-content hover:text-content"
        >
          Continuar navegando
        </Link>
      </div>
    </section>
  );
}
