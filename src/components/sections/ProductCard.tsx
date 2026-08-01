'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useCart } from '@/components/cart/CartProvider';
import { WishlistButton } from '@/components/products/WishlistButton';
import { cn } from '@/lib/cn';
import type { Product } from '@/lib/queries';

export const inr = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export function ProductCard({
  product,
  priority = false,
  colorCount = 0,
  wishlisted = false,
  signedIn = false,
}: {
  product: Product;
  priority?: boolean;
  /** Shown as a "N colours" hint so shoppers know there's a choice. */
  colorCount?: number;
  wishlisted?: boolean;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const { add } = useCart();

  const badge = product.is_best_seller
    ? 'Best seller'
    : product.is_new_arrival
      ? 'New'
      : product.is_trending
        ? 'Trending'
        : null;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    // A card has no colour picker, so a default-colour add only makes sense
    // when the product doesn't require one; otherwise send the shopper to
    // the product page to choose, rather than silently guessing a finish.
    if (colorCount > 0) {
      router.push(`/products/${product.slug}`);
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.thumb,
      unitPrice: product.effectivePrice,
      colorId: null,
      colorName: null,
      colorHex: null,
    });
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[22px] border border-ink-800 bg-[var(--surface)] transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
        {product.thumb && (
          <Image
            src={product.thumb}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[700ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
          />
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {badge ? (
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950">
              {badge}
            </span>
          ) : (
            <span />
          )}
          <WishlistButton
            productId={product.id}
            initialWishlisted={wishlisted}
            signedIn={signedIn}
            size="sm"
          />
        </div>

        {product.discountPercent !== null && (
          <span className="absolute bottom-3 left-3 rounded-full bg-flame-700 px-2.5 py-1 text-[10px] font-bold text-white">
            −{product.discountPercent}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-flame-700">
          {product.category_name}
        </p>

        <h3 className="mt-1.5 font-display text-[15.5px] font-bold leading-snug tracking-tight text-ink-100">
          {product.name}
        </h3>

        {colorCount > 0 && (
          <p className="mt-1.5 text-[11.5px] text-ink-500">
            {colorCount} colour{colorCount === 1 ? '' : 's'} available
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-base font-extrabold text-ink-100">
              {inr(product.effectivePrice)}
            </span>
            {product.discount_price && (
              <span className="text-xs text-ink-600 line-through">{inr(product.price)}</span>
            )}
          </div>

          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 text-[12px] font-semibold text-ink-400">
              <Star className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
              {product.rating_avg.toFixed(1)}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={quickAdd}
          className={cn(
            'mt-3 rounded-xl border border-ink-700 py-2.5 text-center text-[13px] font-bold text-ink-100',
            'transition-colors hover:bg-ink-100 hover:text-ink-950',
          )}
        >
          Add to bag
        </button>
      </div>
    </Link>
  );
}
