"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

// The Payment Brick, rendered on our own page. Mercado Pago processes the
// charge, but the customer never leaves ALBIZIA. The card number is tokenized
// inside the Brick, in the browser, so it never touches our server.

type Result = {
  status?: string;
  statusDetail?: string;
  pixCode?: string | null;
  pixQrBase64?: string | null;
  boletoUrl?: string | null;
};

export function PaymentStep({
  publicKey,
  orderId,
  amountCents,
  email,
}: {
  publicKey: string;
  orderId: string;
  amountCents: number;
  email: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    initMercadoPago(publicKey, { locale: "pt-BR" });
    setReady(true);
  }, [publicKey]);

  if (!publicKey) {
    return (
      <p className="border border-content/30 px-4 py-3 text-[13px] leading-relaxed text-content/70">
        O pagamento ainda não foi configurado nesta loja. Se você é o administrador, conecte a conta
        em Admin, Pagamentos.
      </p>
    );
  }

  // Pix: show the QR and the copy-and-paste code right here, no redirect.
  if (result?.pixCode) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[12px] uppercase tracking-[0.2em] text-content/60">
          Escaneie para pagar com Pix
        </p>
        {result.pixQrBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/png;base64,${result.pixQrBase64}`}
            alt="QR Code do Pix"
            className="h-56 w-56 border border-content/10"
          />
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(result.pixCode ?? "").then(
              () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
              },
              () => setCopied(false),
            );
          }}
          className="border border-content px-6 py-3 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          {copied ? "Código copiado ✓" : "Copiar código Pix"}
        </button>
        <p className="max-w-sm text-[12px] leading-relaxed text-content/50">
          O código expira em alguns minutos. Assim que o pagamento cair, confirmamos seu pedido por
          e-mail automaticamente.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/checkout/confirmacao?order=${orderId}`)}
          className="text-[12px] uppercase tracking-[0.15em] text-content/40 hover:text-content"
        >
          Já paguei, ver meu pedido
        </button>
      </div>
    );
  }

  // Boleto: hand over the printable slip.
  if (result?.boletoUrl) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-[12px] uppercase tracking-[0.2em] text-content/60">Boleto gerado</p>
        <a
          href={result.boletoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-content px-6 py-3 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          Abrir boleto
        </a>
        <p className="max-w-sm text-[12px] leading-relaxed text-content/50">
          O boleto leva até 2 dias úteis para compensar. Separamos seu pedido assim que o pagamento
          for confirmado.
        </p>
      </div>
    );
  }

  // Rejected: say so plainly and let them try another method.
  if (result && result.status && result.status !== "approved" && result.status !== "in_process") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-content/80">Não conseguimos aprovar esse pagamento.</p>
        <p className="max-w-sm text-[12px] leading-relaxed text-content/50">
          Isso costuma ser o banco recusando a transação, não um erro do seu pedido. Você pode tentar
          outro cartão, Pix ou boleto.
        </p>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="border border-content px-6 py-3 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div>
      {ready && (
        <Payment
          initialization={{ amount: amountCents / 100, payer: { email } }}
          customization={{
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all", // Pix
              ticket: "all", // Boleto
            },
          }}
          onSubmit={async ({ formData }) => {
            const res = await fetch("/api/mercadopago/process-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, formData }),
            });
            const data = await res.json();

            if (!res.ok) {
              // Rejecting keeps the Brick's own error UI in charge.
              throw new Error(data.error ?? "Falha no pagamento.");
            }

            if (data.status === "approved") {
              router.push(`/checkout/confirmacao?order=${orderId}`);
              return;
            }
            setResult(data);
          }}
          onError={(error) => {
            console.error("Payment Brick error", error);
          }}
        />
      )}

      {/* The trust line. With Checkout Transparente the charge really is
          processed by Mercado Pago, so this is a statement of fact, not a
          badge — and it is the single most reassuring true thing we can say. */}
      <p className="mt-6 text-center text-[11px] leading-relaxed text-content/40">
        Pagamento processado e protegido pelo <strong className="font-medium">Mercado Pago</strong>.
        Os dados do seu cartão são criptografados no seu navegador e não passam pelos servidores da
        ALBIZIA.
      </p>
    </div>
  );
}
