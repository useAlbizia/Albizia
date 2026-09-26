"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useCart } from "@/lib/cart-context";
import {
  createPendingOrder,
  applyCoupon,
  quoteFreteAction,
  type CheckoutState,
} from "@/lib/checkout/actions";
import { track } from "@/lib/analytics-client";
import { computeShipping, type ShippingConfig, type ShippingOption } from "@/lib/shipping-calc";
import { PaymentStep } from "./PaymentStep";
import { OrderSummary } from "./OrderSummary";
import { SeloCompraSegura } from "@/components/CompraSegura";

const initialState: CheckoutState = {};

const inputClass =
  "border border-content/30 bg-transparent px-4 py-3 text-sm outline-none focus:border-content";

function money(reais: number): string {
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Máscara conforme digita: CPF até 11 dígitos, CNPJ a partir daí, porque
// pessoa jurídica também compra. A validação de verdade (dígito verificador)
// acontece no servidor, em lib/fiscal.ts.
function formatDocumentoDigitando(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function CheckoutClient({
  method,
  shipping,
  publicKey,
}: {
  method: "flat" | "melhor_envio";
  shipping: ShippingConfig;
  publicKey: string;
}) {
  const { items, totalPrice } = useCart();
  const action = createPendingOrder.bind(null, items);
  const [state, formAction, pending] = useActionState(action, initialState);

  // Kept in state so the Payment Brick can pre-fill the payer once the order
  // moves to the payment step.
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponPending, startCoupon] = useTransition();

  const [zip, setZip] = useState("");
  // As opções reais da transportadora, para o cliente escolher entre pagar
  // menos e receber antes. Antes disso a loja escolhia sozinha a mais barata
  // e nem guardava qual era, o que impedia emitir a etiqueta depois.
  const [freteOptions, setFreteOptions] = useState<ShippingOption[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [quotedCents, setQuotedCents] = useState<number | null>(null);
  const [freteMsg, setFreteMsg] = useState<string | null>(null);
  const [fretePending, startFrete] = useTransition();

  const hasItems = items.length > 0;
  useEffect(() => {
    if (hasItems) track({ type: "checkout_start" });
  }, [hasItems]);

  if (items.length === 0) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center px-6 py-28 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-content/50">
          Seu carrinho está vazio
        </p>
        <Link
          href="/colecoes"
          className="mt-8 border border-content px-8 py-3 text-[13px] uppercase tracking-[0.2em] transition-colors hover:bg-content hover:text-surface"
        >
          Ver coleções
        </Link>
      </section>
    );
  }

  const subtotalCents = Math.round(totalPrice * 100);
  const isME = method === "melhor_envio";
  // Flat: computed instantly. Melhor Envio: null until the customer quotes a CEP.
  const shippingCents = isME ? quotedCents : computeShipping(subtotalCents, shipping);
  const effectiveDiscount = Math.min(discountCents, subtotalCents);
  const totalCents = subtotalCents - effectiveDiscount + (shippingCents ?? 0);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  // The order exists: the customer moves from "seus dados" to paying in place.
  const paying = !!state.orderId;

  function calcFrete() {
    startFrete(async () => {
      const r = await quoteFreteAction(zip, items);
      setFreteOptions(r.options);
      if (r.options.length > 0) {
        // Vem ordenado do mais barato para o mais caro, então o primeiro é o
        // padrão. O cliente troca se quiser receber antes.
        setServiceId(r.options[0].id);
        setQuotedCents(r.options[0].priceCents);
        setFreteMsg(null);
      } else {
        setServiceId(null);
        setQuotedCents(r.flatCents);
        setFreteMsg(
          r.flatCents === null
            ? "Não foi possível calcular o frete para este CEP. Confira o número."
            : null
        );
      }
    });
  }

  function escolherServico(o: ShippingOption) {
    setServiceId(o.id);
    setQuotedCents(o.priceCents);
  }

  function handleApply() {
    startCoupon(async () => {
      const r = await applyCoupon(couponInput, subtotalCents);
      if (r.ok) {
        setDiscountCents(r.discountCents);
        setCouponCode(r.code);
        setCouponMsg(`${r.code}: ${money(r.discountCents / 100)} de desconto`);
      } else {
        setDiscountCents(0);
        setCouponCode("");
        setCouponMsg(r.message);
      }
    });
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="mb-10 text-center text-sm uppercase tracking-[0.3em] text-content/60">
        Checkout
      </h1>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        {/* No celular o resumo vem primeiro, como barra com o total sempre
            à vista. No desktop ele vai para a direita e gruda enquanto a
            pessoa preenche o endereço. */}
        <div className="order-1 lg:order-2">
          <OrderSummary
            items={items}
            subtotalCents={subtotalCents}
            discountCents={effectiveDiscount}
            couponCode={couponCode}
            shippingCents={shippingCents}
            awaitingCep={isME}
            totalCents={totalCents}
            couponInput={couponInput}
            onCouponInput={setCouponInput}
            onApplyCoupon={handleApply}
            couponPending={couponPending}
            couponMsg={couponMsg}
          />
        </div>

        <div className="order-2 min-w-0 lg:order-1">
      {paying ? (
        <div>
          <PaymentStep
            publicKey={publicKey}
            orderId={state.orderId as string}
            amountCents={state.totalCents ?? totalCents}
            email={email}
          />
        </div>
      ) : (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="couponCode" value={couponCode} />
        <p className="text-[11px] uppercase tracking-[0.2em] text-content/50">Seus dados</p>
        <input name="name" placeholder="Nome completo" required className={inputClass} />
        <input
          name="email"
          type="email"
          placeholder="E-mail"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input name="phone" placeholder="Telefone" required className={inputClass} />
        <div className="flex flex-col gap-1">
          <input
            name="document"
            inputMode="numeric"
            autoComplete="off"
            placeholder="CPF"
            required
            value={documento}
            onChange={(e) => setDocumento(formatDocumentoDigitando(e.target.value))}
            className={inputClass}
          />
          <p className="text-[11px] text-content/40">
            Necessário para emitir a nota fiscal do seu pedido.
          </p>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-content/50">Entrega</p>
        <div className="grid grid-cols-3 gap-3">
          <input name="street" placeholder="Endereço" required className={`${inputClass} col-span-2`} />
          <input name="number" placeholder="Número" required className={inputClass} />
        </div>
        <input name="complement" placeholder="Complemento (opcional)" className={inputClass} />
        <input name="neighborhood" placeholder="Bairro" required className={inputClass} />
        <div className="grid grid-cols-3 gap-3">
          <input name="city" placeholder="Cidade" required className={`${inputClass} col-span-2`} />
          <input name="state" placeholder="UF" maxLength={2} required className={inputClass} />
        </div>
        <div className="flex gap-2">
          <input
            name="zip"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              setQuotedCents(null);
              setFreteOptions([]);
              setServiceId(null);
              setFreteMsg(null);
            }}
            placeholder="CEP"
            required
            className={`${inputClass} flex-1`}
          />
          {isME && (
            <button
              type="button"
              onClick={calcFrete}
              disabled={fretePending || zip.replace(/\D/g, "").length !== 8}
              className="shrink-0 border border-content px-4 text-[12px] uppercase tracking-[0.15em] transition-colors hover:bg-content hover:text-surface disabled:opacity-40"
            >
              {fretePending ? "..." : "Calcular frete"}
            </button>
          )}
        </div>

        {/* O serviço escolhido viaja junto com o pedido. Sem ele o painel não
            tem como comprar a etiqueta certa depois. */}
        <input type="hidden" name="shippingServiceId" value={serviceId ?? ""} />

        {freteMsg && <p className="text-[12px] text-content/60">{freteMsg}</p>}

        {freteOptions.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[11px] uppercase tracking-[0.2em] text-content/50">
              Entrega
            </legend>
            {freteOptions.map((o) => {
              const ativo = o.id === serviceId;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 border px-4 py-3 text-sm transition-colors ${
                    ativo ? "border-content" : "border-content/20 hover:border-content/40"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shippingService"
                      checked={ativo}
                      onChange={() => escolherServico(o)}
                      className="accent-content"
                    />
                    <span>
                      <span className="block">
                        {o.company} {o.name}
                      </span>
                      <span className="block text-[12px] text-content/50">
                        {o.deliveryDays === null
                          ? "prazo informado pela transportadora"
                          : `até ${o.deliveryDays} ${o.deliveryDays === 1 ? "dia útil" : "dias úteis"}`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0">{money(o.priceCents / 100)}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        {state.error && (
          <p className="text-[13px] text-content/70" role="alert">
            {state.error}
          </p>
        )}

        <div className="mt-6">
          <SeloCompraSegura />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full border border-content py-4 text-[13px] uppercase tracking-[0.2em] text-content transition-colors hover:bg-content hover:text-surface disabled:opacity-50"
        >
          {pending ? "Aguarde..." : "Continuar para pagamento"}
        </button>

        <p className="text-center text-[11px] text-content/40">
          Você paga aqui mesmo, sem sair da ALBIZIA. Cartão, Pix ou boleto.
        </p>
      </form>
      )}
        </div>
      </div>
    </section>
  );
}
