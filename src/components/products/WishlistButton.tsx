'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * The heart on a product card / product page.
 *
 * `initialWishlisted` comes from the server (one query per listing page,
 * not one fetch per card) so the icon is correct on first paint. State then
 * updates optimistically — the API's toggle is idempotent, so a failed
 * request just reverts the icon rather than leaving it out of sync.
 */
export function WishlistButton({
  productId,
  initialWishlisted = false,
  signedIn,
  size = 'md',
  className,
}: {
  productId: number;
  initialWishlisted?: boolean;
  signedIn: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initialWishlisted);
  const [pending, setPending] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (pending) return;

    const next = !on;
    setOn(next); // optimistic — the toggle endpoint is idempotent either way
    setPending(true);

    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) setOn(!next); // revert on failure
      else {
        const data = await res.json();
        setOn(Boolean(data.wishlisted));
      }
    } catch {
      setOn(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={on}
      className={cn(
        'flex items-center justify-center rounded-full bg-white/90 text-ink-600 shadow-lift transition-transform hover:scale-105 active:scale-95',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4', on && 'fill-flame-600 text-flame-600')}
      />
    </button>
  );
}
