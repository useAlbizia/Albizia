import Link from "next/link";
import { PaymentBadges } from "./PaymentBadges";

// ALBIZIA's own security seal. Every line here is a statement of fact about
// how this specific store actually works, not a third-party certification:
//
//  - The card is tokenized inside the Mercado Pago Brick, in the browser, so
//    the number genuinely never reaches our servers (see PaymentStep.tsx and
//    api/mercadopago/process-payment/route.ts).
//  - HTTPS is enforced by the Strict-Transport-Security header (next.config.ts).
//  - We store no card data anywhere: the orders table has no card columns.
//  - LGPD handling is described in /privacidade.
//
// If any of those stop being true, the matching line has to come out. Nothing
// here may become decorative.

function Shield({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2.5l7.5 3v6c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10v-6l7.5-3z" strokeLinejoin="round" />
      <path d="M9 12l2.2 2.2L15.5 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FACTS = [
  "Conexão criptografada (HTTPS) em todas as páginas",
  "Os dados do seu cartão são criptografados no seu navegador",
  "Não guardamos nenhum dado de cartão nos nossos servidores",
  "Pagamento processado pelo Mercado Pago",
];

// Compact seal, for the checkout right next to the payment form.
export function SeloCompraSegura() {
  return (
    <div className="flex items-start gap-3 border border-content/15 px-4 py-3">
      <Shield className="mt-0.5 h-5 w-5 shrink-0 text-content/60" />
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/70">Compra segura</p>
        <p className="mt-1 text-[11px] leading-relaxed text-content/45">
          Seus dados de pagamento são criptografados no navegador e processados pelo Mercado Pago.
          A ALBIZIA nunca recebe o número do seu cartão.
        </p>
      </div>
    </div>
  );
}

// Fuller block, for the footer: what we accept and why it is safe.
export function CompraSegura() {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/40">Formas de pagamento</p>
        <PaymentBadges />
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-content/60">
          <Shield className="h-4 w-4" />
          <p className="text-[11px] uppercase tracking-[0.2em]">Compra segura</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-center">
          {FACTS.map((fact) => (
            <li key={fact} className="text-[11px] leading-relaxed text-content/40">
              {fact}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-content/35">
          Seus dados pessoais seguem a{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-content/60">
            LGPD
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
