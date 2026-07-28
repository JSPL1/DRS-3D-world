'use client';

import { useState } from 'react';

import { BuyBox } from '@/components/products/BuyBox';
import { ProductGallery } from '@/components/products/ProductGallery';
import type { ProductColor } from '@/lib/queries';

type Img = { id: number; url: string; alt: string | null };

/**
 * Couples the gallery to the buy box so choosing a colour swaps the product
 * photograph. They have to share state, and the page itself is a server
 * component, so the join happens here.
 */
export function ProductPurchasePanel({
  productId,
  slug,
  name,
  basePrice,
  listPrice,
  images,
  spin,
  colors,
  inStock,
  madeToOrder,
}: {
  productId: number;
  slug: string;
  name: string;
  basePrice: number;
  listPrice: number | null;
  images: Img[];
  spin: Img[];
  colors: ProductColor[];
  inStock: boolean;
  madeToOrder: boolean;
}) {
  const defaultColor = colors.find((c) => c.isDefault) ?? colors[0] ?? null;
  const [color, setColor] = useState<ProductColor | null>(defaultColor);

  // A colour with its own photograph pushes that image to the front of the
  // gallery; colours without one fall back to the standard shots.
  const gallery =
    color?.imageUrl
      ? [
          { id: -1 * (color.id + 1), url: color.imageUrl, alt: `${name} in ${color.name}` },
          ...images.filter((i) => i.url !== color.imageUrl),
        ]
      : images;

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <ProductGallery
        key={color?.imageUrl ?? 'default'}
        images={gallery}
        spin={spin}
        name={name}
      />

      <div className="lg:pt-2">
        <BuyBox
          productId={productId}
          slug={slug}
          name={name}
          basePrice={basePrice}
          listPrice={listPrice}
          fallbackImage={images[0]?.url ?? null}
          colors={colors}
          inStock={inStock}
          madeToOrder={madeToOrder}
          onColorChange={setColor}
        />
      </div>
    </div>
  );
}
