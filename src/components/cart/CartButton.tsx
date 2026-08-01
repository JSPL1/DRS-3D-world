'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { useCart } from '@/components/cart/CartProvider';

/** Header "Bag" pill with a live item count. */
export function CartButton() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Bag, ${count} item${count === 1 ? '' : 's'}` : 'Bag, empty'}
      className="flex h-9 items-center gap-2 rounded-full bg-ink-100 pl-3.5 pr-2 text-[13px] font-bold text-ink-950 transition-opacity hover:opacity-90"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="hidden sm:inline">Bag</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-flame-700 px-1.5 text-[11px] font-extrabold leading-none text-white">
        {ready ? (count > 99 ? '99+' : count) : 0}
      </span>
    </Link>
  );
}
