'use client';

import { useMemo } from 'react';

/**
 * Infinite capability strip. Duplicated once and translated by exactly -50%,
 * which is what makes the loop seamless.
 */
export function Marquee({
  items,
  speedSeconds = 42,
  reverse = false,
}: {
  items: string[];
  speedSeconds?: number;
  reverse?: boolean;
}) {
  const doubled = useMemo(() => [...items, ...items], [items]);

  return (
    <div
      className="relative flex overflow-hidden border-y border-white/5 py-5"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div
        className="flex shrink-0 items-center gap-10 whitespace-nowrap pr-10 will-change-transform"
        style={{
          animation: `drs-marquee ${speedSeconds}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-10">
            <span className="font-display text-xl font-semibold tracking-tight text-ink-200 sm:text-2xl">
              {item}
            </span>
            <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-flame-500" />
          </span>
        ))}
      </div>

      <style>{`
        @keyframes drs-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="drs-marquee"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
