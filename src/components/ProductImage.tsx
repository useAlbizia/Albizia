import Image from "next/image";
import { ProductPlaceholder } from "./ProductPlaceholder";
import type { ProductImage as ProductImageRow } from "@/lib/products";

type ProductCoverProps = {
  name: string;
  images: ProductImageRow[];
  role?: string;
  className?: string;
  tone?: "cream" | "taupe" | "graphite";
};

// Renders the real uploaded photo for a product when one exists, falling
// back to ProductPlaceholder otherwise — same className contract as
// ProductPlaceholder so callers can swap between them freely.
export function ProductCover({ name, images, role, className, tone }: ProductCoverProps) {
  const match = role ? images.find((img) => img.role === role) : images[0];

  if (!match) {
    return <ProductPlaceholder name={name} className={className} tone={tone} />;
  }

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={match.url}
        alt={name}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
    </div>
  );
}
