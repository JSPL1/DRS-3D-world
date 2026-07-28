import { Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
}: {
  product: Product;
  priority?: boolean;
  /** Shown as a "N colours" hint so shoppers know there's a choice. */
  colorCount?: number;
}) {
  const badge = product.is_best_seller
    ? 'Best seller'
    : product.is_new_arrival
      ? 'New'
      : product.is_trending
        ? 'Trending'
        : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group card-edge glass relative flex flex-col overflow-hidden rounded-2xl transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-flame-500/30 hover:shadow-glow-sm"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-900">
        {product.thumb && (
          <Image
            src={product.thumb}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.07]"
          />
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
          {badge && (
            <span className="rounded-full bg-flame-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow-sm">
              {badge}
            </span>
          )}
          {product.discountPercent !== null && (
            <span className="ml-auto on-media rounded-full px-2.5 py-1 text-[10px] font-bold text-flame-400 backdrop-blur-sm">
              −{product.discountPercent}%
            </span>
          )}
        </div>

        {/* Technology chip */}
        {product.print_technology && (
          <span className="absolute bottom-3.5 left-3.5 on-media rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide backdrop-blur-sm">
            {product.print_technology}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-flame-500">
          {product.category_name}
        </p>

        <h3 className="mt-2 font-display text-[17px] font-semibold leading-snug tracking-tight text-white transition-colors group-hover:text-flame-400">
          {product.name}
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-ink-400">
          {product.short_description}
        </p>

        {colorCount > 0 && (
          <p className="mt-2.5 text-[11.5px] text-ink-400">
            {colorCount} colour{colorCount === 1 ? '' : 's'} available
          </p>
        )}

        <div className="mt-4 flex items-end justify-between border-t border-white/5 pt-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-bold text-white">
                {inr(product.effectivePrice)}
              </span>
              {product.discount_price && (
                <span className="text-xs text-ink-500 line-through">{inr(product.price)}</span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {product.availability === 'in_stock' ? 'In stock' : 'Made to order'}
            </p>
          </div>

          {product.rating_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-ink-300">
              <Star className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
              <span className="font-medium text-white">{product.rating_avg.toFixed(1)}</span>
              <span className="text-ink-500">({product.rating_count})</span>
            </div>
          )}
        </div>
      </div>

      {/* Top edge lights up on hover */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame-500 to-transparent',
          'opacity-0 transition-opacity duration-500 group-hover:opacity-100',
        )}
      />
    </Link>
  );
}
