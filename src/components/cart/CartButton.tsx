'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { useCart } from '@/components/cart/CartProvider';

/** Header cart link with a live item count. */
export function CartButton() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
    >
      <ShoppingCart className="h-[18px] w-[18px]" />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-flame-700 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-ink-950">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
