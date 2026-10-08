"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { corrigirEmailDoPedido } from "@/lib/checkout/actions";

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

  // O e-mail do pedido, corrigível aqui porque é a última tela antes de pagar
  // e o pedido já está gravado: só mudar o que está na tela não resolveria.
  const [emailAtual, setEmailAtual] = useState(email);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(email);
  const [emailErro, setEmailErro] = useState<string | null>(null);
  const [salvandoEmail, startEmail] = useTransition();

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
      {/* A ÚLTIMA CHANCE DE PEGAR O ERRO DE DIGITAÇÃO.
          Confirmação, rastreio e recuperação de pedido dependem todos deste
          endereço. Dentro do campo do formulário a pessoa já parou de olhar
          para ele; isolado numa linha, ela enxerga o próprio "gmial.com".
          Depois que pagar, um e-mail errado deixa o pedido inalcançável. */}
      <div className="mb-5 border border-content/15 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.15em] text-content/40">
              Confirmação e rastreio vão para
            </p>
            <p className="mt-0.5 break-all text-sm">{emailAtual}</p>
          </div>
          {!editando && (
            <button
              type="button"
              onClick={() => {
                setRascunho(emailAtual);
                setEmailErro(null);
                setEditando(true);
              }}
              className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-content/45 underline underline-offset-4 transition-colors hover:text-content"
            >
              Não é esse, corrigir
            </button>
          )}
        </div>

        {editando && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              autoFocus
              className="flex-1 border border-content/30 bg-transparent px-3 py-2 text-sm outline-none focus:border-content"
            />
            <button
              type="button"
              disabled={salvandoEmail}
              onClick={() =>
                startEmail(async () => {
                  const r = await corrigirEmailDoPedido(orderId, rascunho);
                  if ("error" in r) {
                    setEmailErro(r.error);
                    return;
                  }
                  setEmailAtual(r.email);
                  setEditando(false);
                  setEmailErro(null);
                })
              }
              className="shrink-0 border border-content px-5 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
            >
              {salvandoEmail ? "..." : "Salvar"}
            </button>
          </div>
        )}
        {emailErro && <p className="mt-2 text-[12px] text-content/70">{emailErro}</p>}
      </div>

      {ready && (
        <Payment
          key={emailAtual}
          initialization={{ amount: amountCents / 100, payer: { email: emailAtual } }}
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
