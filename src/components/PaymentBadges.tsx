"use client";

import { useState } from "react";

// Selos de marca. A arte oficial vive em /public/brands/<slug>.svg (uso
// nominativo: indicar o que a loja aceita e com quem envia).
//
// Se o arquivo ainda não estiver lá, o componente cai sozinho num wordmark de
// texto. Então basta soltar o SVG oficial na pasta que ele passa a aparecer,
// sem mexer em código. É por isso que a checagem é via onError e não via
// lista fixa: o componente roda no cliente, dentro do Footer.

type Brand = {
  slug: string;
  label: string;
  // Usado só enquanto o SVG oficial não existe.
  fallback: string;
  color: string;
};

const PAYMENT: Brand[] = [
  { slug: "pix", label: "Pix", fallback: "PIX", color: "#32BCAD" },
  { slug: "visa", label: "Visa", fallback: "VISA", color: "#1A1F71" },
  { slug: "mastercard", label: "Mastercard", fallback: "mastercard", color: "#EB001B" },
  { slug: "elo", label: "Elo", fallback: "elo", color: "#211E1F" },
  { slug: "amex", label: "American Express", fallback: "AMEX", color: "#1F72CD" },
  { slug: "mercadopago", label: "Mercado Pago", fallback: "mercado pago", color: "#009EE3" },
];

const SHIPPING: Brand[] = [
  { slug: "melhorenvio", label: "Melhor Envio", fallback: "melhor envio", color: "#0FAFA5" },
  { slug: "correios", label: "Correios", fallback: "Correios", color: "#00416B" },
  { slug: "jadlog", label: "Jadlog", fallback: "Jadlog", color: "#D3232A" },
];

function BrandMark({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      role="img"
      aria-label={brand.label}
      title={brand.label}
      className="inline-flex h-8 min-w-[46px] items-center justify-center rounded-[4px] border border-black/10 bg-white px-2 shadow-sm"
    >
      {failed ? (
        <span
          className="text-[8px] font-bold leading-none tracking-tight"
          style={{ color: brand.color }}
        >
          {brand.fallback}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/brands/${brand.slug}.svg`}
          alt={brand.label}
          className="h-4 w-auto max-w-[44px] object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

function Row({ brands }: { brands: Brand[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {brands.map((b) => (
        <BrandMark key={b.slug} brand={b} />
      ))}
    </div>
  );
}

export function PaymentBadges() {
  return <Row brands={PAYMENT} />;
}

// Transportadoras que a loja de fato usa. O Melhor Envio é a plataforma que
// cota as demais (ver lib/shipping.ts), então nomear as três é verdade.
export function ShippingBadges() {
  return <Row brands={SHIPPING} />;
}
