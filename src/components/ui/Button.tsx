'use client';

import Link from 'next/link';
import { forwardRef, useRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Three-tier hierarchy, matching the redesign:
 *  - `primary`   solid near-black — the default action on a screen
 *  - `accent`    solid flame orange — reserved for the one action that moves
 *                money or commits an order (Buy now, Pay, Checkout, Place order)
 *  - `secondary` white card with a hairline border
 *  - `outline`   transparent, border only
 *  - `ghost`     text only
 *
 * `accent` fills with flame-700 rather than the brand's vivid flame-500:
 * white text on #ff6a00 measures 2.87:1, under the 4.5:1 WCAG AA minimum,
 * where #bf4a00 reaches 5.01:1. The bright orange stays for glow, borders,
 * icons and text-on-dark, where it isn't carrying white text on itself.
 */
type Variant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  // ink-100 and ink-950 are each theme's two extremes and are always exact
  // opposites of one another (near-black/near-white in light, the reverse in
  // dark) — that pairing is what guarantees this button is never
  // text-on-matching-background. `text-white` would not: it resolves to
  // "primary ink", the same value as `ink-100` in every theme, which is
  // this component's own background — invisible text on itself.
  primary:
    'bg-ink-100 text-ink-950 hover:opacity-90 active:opacity-85 shadow-lift',
  accent:
    'bg-flame-700 text-white shadow-glow-sm hover:bg-flame-800 hover:shadow-glow active:bg-flame-800',
  secondary:
    'glass text-ink-100 hover:border-ink-600',
  // text-flame-400 alone is correct in both themes: the existing light-theme
  // override rule in globals.css already re-maps it to flame-700 for AA
  // contrast on white, and flame-400 (8.4:1) is what dark needs unchanged.
  outline:
    'border border-flame-500/50 text-flame-400 hover:bg-flame-500/10 hover:border-flame-500',
  ghost:
    'text-ink-400 hover:text-ink-100 hover:bg-ink-850',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-6 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-2xl',
};

const BASE =
  'sheen relative inline-flex select-none items-center justify-center font-semibold tracking-tight ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-expo)] ' +
  'disabled:pointer-events-none disabled:opacity-45 will-change-transform';

/** Pulls the element a little toward the pointer — subtle, physical, not gimmicky. */
function useMagnetic(strength = 0.32) {
  const ref = useRef<HTMLElement | null>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  };

  const onPointerLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  return { ref, onPointerMove, onPointerLeave };
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', magnetic = true, className, children, ...props },
  forwardedRef,
) {
  const magnet = useMagnetic();

  return (
    <button
      ref={(node) => {
        magnet.ref.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      onPointerMove={magnetic ? magnet.onPointerMove : undefined}
      onPointerLeave={magnetic ? magnet.onPointerLeave : undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  magnetic = true,
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className'>) {
  const magnet = useMagnetic();

  return (
    <Link
      href={href}
      ref={magnet.ref as never}
      onPointerMove={magnetic ? magnet.onPointerMove : undefined}
      onPointerLeave={magnetic ? magnet.onPointerLeave : undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
