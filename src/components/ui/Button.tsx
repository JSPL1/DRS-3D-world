'use client';

import Link from 'next/link';
import { forwardRef, useRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  // flame-700 rather than the vivid flame-500: white text on #ff6b00 measures
  // 2.86:1, below the 4.5:1 WCAG AA minimum, whereas #bf4a00 reaches 5.01:1.
  // The bright brand orange is kept for glow, borders, icons and marks, where
  // it isn't carrying text.
  primary:
    'bg-flame-700 text-white shadow-glow-sm hover:bg-flame-800 hover:shadow-glow active:bg-flame-800',
  secondary:
    'glass text-white hover:bg-white/10 hover:border-white/20',
  outline:
    'border border-flame-500/50 text-flame-400 hover:bg-flame-500/10 hover:border-flame-500',
  ghost:
    'text-ink-200 hover:text-white hover:bg-white/5',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] gap-1.5 rounded-lg',
  md: 'h-11 px-6 text-sm gap-2 rounded-xl',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-2xl',
};

const BASE =
  'sheen relative inline-flex select-none items-center justify-center font-medium tracking-tight ' +
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
