'use client';

import { Check, Minus, Plus, ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCart } from '@/components/cart/CartProvider';
import { cn } from '@/lib/cn';
import type { ProductColor } from '@/lib/queries';

export const inr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

/**
 * The purchase panel: colour, quantity, add to cart, buy now.
 *
 * Selecting a colour lifts the choice to the parent so the gallery can swap
 * to that colour's photograph — the behaviour shoppers expect from any large
 * storefront, and the reason colour lives here rather than inside the gallery.
 */
export function BuyBox({
  productId,
  slug,
  name,
  basePrice,
  listPrice,
  fallbackImage,
  colors,
  inStock,
  madeToOrder,
  onColorChange,
}: {
  productId: number;
  slug: string;
  name: string;
  basePrice: number;
  listPrice: number | null;
  fallbackImage: string | null;
  colors: ProductColor[];
  inStock: boolean;
  madeToOrder: boolean;
  onColorChange?: (color: ProductColor | null) => void;
}) {
  const router = useRouter();
  const { add } = useCart();

  const [selected, setSelected] = useState<ProductColor | null>(
    colors.find((c) => c.isDefault) ?? colors[0] ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const unitPrice = basePrice + (selected?.priceDelta ?? 0);
  const image = selected?.imageUrl ?? fallbackImage;

  function choose(color: ProductColor) {
    setSelected(color);
    onColorChange?.(color);
  }

  function buildLine() {
    return {
      productId,
      slug,
      name,
      image,
      unitPrice,
      colorId: selected?.id ?? null,
      colorName: selected?.name ?? null,
      colorHex: selected?.hex ?? null,
    };
  }

  function addToCart() {
    add(buildLine(), quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }

  function buyNow() {
    add(buildLine(), quantity);
    router.push('/checkout');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Price */}
      <div>
        <div className="flex items-end gap-3">
          <span className="font-display text-4xl font-bold tracking-tight text-ink-100">
            {inr(unitPrice)}
          </span>
          {listPrice && listPrice > unitPrice && (
            <>
              <span className="pb-1.5 text-lg text-ink-500 line-through">{inr(listPrice)}</span>
              <span className="mb-2 rounded-full bg-flame-700/15 px-2.5 py-1 text-[11px] font-bold text-flame-500">
                Save {Math.round(((listPrice - unitPrice) / listPrice) * 100)}%
              </span>
            </>
          )}
        </div>
        <p className="mt-1.5 text-[13px] text-ink-400">
          Inclusive of GST · {inStock ? 'In stock' : madeToOrder ? 'Made to order' : 'Currently unavailable'}
        </p>
      </div>

      {/* Colour */}
      {colors.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium text-ink-200">
              Colour{selected && <span className="text-ink-400"> — {selected.name}</span>}
            </span>
            <span className="text-[12px] text-ink-500">
              {colors.length} option{colors.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const active = selected?.id === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => choose(color)}
                  aria-pressed={active}
                  aria-label={`${color.name}${color.priceDelta ? `, ${inr(color.priceDelta)} more` : ''}`}
                  title={color.name}
                  className={cn(
                    'relative h-11 w-11 rounded-xl border-2 transition-all duration-200',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-500',
                    active
                      ? 'border-flame-500 scale-105 shadow-glow-sm'
                      : 'border-ink-700 hover:border-ink-500',
                  )}
                >
                  <span
                    className="absolute inset-1 rounded-lg"
                    style={{ backgroundColor: color.hex }}
                  />
                  {active && (
                    <Check
                      className="absolute inset-0 m-auto h-4 w-4 drop-shadow"
                      style={{ color: pickInk(color.hex) }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selected && selected.priceDelta !== 0 && (
            <p className="mt-2 text-[12px] text-ink-400">
              {selected.name} adds {inr(selected.priceDelta)} to the base price.
            </p>
          )}
        </div>
      )}

      {/* Quantity */}
      <div>
        <span className="text-[13px] font-medium text-ink-200">Quantity</span>
        <div className="mt-3 inline-flex items-center rounded-xl border border-ink-700">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center rounded-l-xl text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            aria-live="polite"
            className="w-12 text-center font-mono text-[15px] tabular-nums text-ink-100"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            disabled={quantity >= 99}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center rounded-r-xl text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          className={cn(
            'flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-300',
            added
              ? 'border-emerald-500 text-emerald-400'
              : 'border-flame-600 text-flame-500 hover:bg-flame-700/10',
          )}
        >
          {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {added ? 'Added to cart' : 'Add to cart'}
        </button>

        <button
          type="button"
          onClick={buyNow}
          className="sheen flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-flame-700 text-sm font-semibold text-white shadow-glow-sm transition-colors hover:bg-flame-800"
        >
          <Zap className="h-4 w-4" />
          Buy now
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-500">
        Made to order in Bhubaneswar. We confirm your colour and finish before printing, and you can
        change either while the order is still pending.
      </p>
    </div>
  );
}

/** Tick mark needs to sit on top of the swatch, so pick by luminance. */
function pickInk(hex: string): string {
  const n = hex.replace('#', '');
  if (n.length < 6) return '#fff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? '#101015' : '#ffffff';
}
