'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type MegaCategory = { name: string; slug: string; count: number };

const SERVICE_LINKS = [
  { label: 'Custom manufacturing', href: '/quote' },
  { label: 'Rapid prototyping', href: '/services#prototyping' },
  { label: 'Bulk & corporate gifting', href: '/services#corporate-gifts' },
  { label: 'Architectural models', href: '/services#architectural-models' },
  { label: 'Medical models', href: '/services#medical-models' },
];

/**
 * The "Shop" dropdown: categories, services, and a quote CTA card, matching
 * the redesign's three-column mega-menu.
 *
 * Opens on hover for a mouse, and on click/Enter for keyboard and touch —
 * hover alone would strand anyone who can't hover. Closes on outside click,
 * Escape, or leaving both the trigger and the panel.
 */
export function MegaMenu({ categories }: { categories: MegaCategory[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // A short delay so moving the pointer from the trigger to the panel across
  // a gap doesn't close it mid-transit.
  const scheduleHide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative" onMouseEnter={show} onMouseLeave={scheduleHide}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg px-3.5 py-2 text-[13.5px] font-semibold text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
      >
        Shop
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-[calc(100%+10px)] z-50 w-[640px] -translate-x-[18%] rounded-[20px] border border-ink-800 bg-[var(--surface)] p-5 shadow-lift"
        >
          <div className="grid grid-cols-[1fr_1fr_200px] gap-5">
            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">
                Categories
              </p>
              <div className="flex flex-col gap-0.5">
                {categories.slice(0, 8).map((c) => (
                  <Link
                    key={c.slug}
                    href={`/products?category=${c.slug}`}
                    role="menuitem"
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-ink-200 transition-colors hover:bg-ink-900 hover:text-flame-700"
                  >
                    <span>{c.name}</span>
                    <span className="text-ink-500">{c.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-500">
                Services
              </p>
              <div className="flex flex-col gap-0.5">
                {SERVICE_LINKS.map((s) => (
                  <Link
                    key={s.label}
                    href={s.href}
                    role="menuitem"
                    className="rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-ink-200 transition-colors hover:bg-ink-900 hover:text-flame-700"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/quote"
              role="menuitem"
              className="flex flex-col justify-between rounded-2xl bg-ink-100 p-4 text-ink-950"
            >
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-flame-600">
                  Instant quote
                </p>
                <p className="mt-2.5 font-display text-[17px] font-bold leading-tight">
                  Drop an STL, get a price in 30 seconds.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-flame-600">
                Upload a file <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
