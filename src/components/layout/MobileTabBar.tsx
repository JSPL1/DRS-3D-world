'use client';

import { Home, LayoutGrid, ShoppingBag, User, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useCart } from '@/components/cart/CartProvider';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { href: '/products', label: 'Shop', icon: LayoutGrid, match: (p: string) => p.startsWith('/products') },
  { href: '/quote', label: 'Quote', icon: Zap, match: (p: string) => p.startsWith('/quote') },
  { href: '/cart', label: 'Bag', icon: ShoppingBag, match: (p: string) => p.startsWith('/cart') },
  { href: '/account', label: 'Account', icon: User, match: (p: string) => p.startsWith('/account') },
];

/**
 * Thumb-reach navigation for small screens, matching the redesign's mobile
 * section: fixed to the bottom, five 48px targets, hidden entirely at the
 * `sm` breakpoint where the header nav takes over instead of stacking both.
 *
 * `pb-16` is added to `<main>` in the site layout so this bar never covers
 * the last few lines of page content.
 */
export function MobileTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { count, ready } = useCart();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-ink-800 bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        const href = tab.href === '/account' && !signedIn ? '/login?next=%2Faccount' : tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold',
              active ? 'text-flame-700' : 'text-ink-500',
            )}
          >
            <span className="relative">
              <Icon className="h-[19px] w-[19px]" />
              {tab.href === '/cart' && ready && count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame-700 px-1 text-[9px] font-extrabold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
