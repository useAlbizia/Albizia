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
  // Nome do arquivo em /public/brands. SVG quando a marca publica vetor,
  // PNG otimizado quando só existe bitmap oficial.
  file: string;
  label: string;
  // Usado só enquanto o arquivo oficial não existe na pasta.
  fallback: string;
  color: string;
};

const PAYMENT: Brand[] = [
  { file: "pix.png", label: "Pix", fallback: "PIX", color: "#32BCAD" },
  { file: "visa.svg", label: "Visa", fallback: "VISA", color: "#1A1F71" },
  { file: "mastercard.svg", label: "Mastercard", fallback: "mastercard", color: "#EB001B" },
  { file: "elo.svg", label: "Elo", fallback: "elo", color: "#211E1F" },
  { file: "amex.svg", label: "American Express", fallback: "AMEX", color: "#1F72CD" },
  { file: "mercadopago.png", label: "Mercado Pago", fallback: "mercado pago", color: "#009EE3" },
];

const SHIPPING: Brand[] = [
  { file: "melhorenvio.png", label: "Melhor Envio", fallback: "melhor envio", color: "#0FAFA5" },
  { file: "correios.png", label: "Correios", fallback: "Correios", color: "#00416B" },
  { file: "jadlog.png", label: "Jadlog", fallback: "Jadlog", color: "#D3232A" },
];

function BrandMark({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      role="img"
      aria-label={brand.label}
      title={brand.label}
      className="inline-flex h-9 min-w-[52px] items-center justify-center rounded-[4px] border border-black/10 bg-white px-2.5 shadow-sm"
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
          src={`/brands/${brand.file}`}
          alt={brand.label}
          className="h-5 w-auto max-w-[76px] object-contain"
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
        <BrandMark key={b.file} brand={b} />
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
