'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Keeps an admin list current without anyone pressing reload.
 *
 * Polls a fingerprint of the table it is watching and calls `router.refresh()`
 * when it moves, which re-runs the server component and swaps the markup in
 * place — form state, scroll position and any open menu survive it.
 *
 * Three things stop this being a background tax:
 *  - it does nothing while the tab is hidden, and checks once on return;
 *  - the fingerprint response is a few bytes, not the page;
 *  - the first fingerprint only establishes a baseline, so mounting the
 *    component never triggers an immediate refresh of the page you just
 *    loaded.
 */
export function LiveRefresh({
  watch,
  intervalMs = 6000,
}: {
  watch: 'products' | 'orders' | 'quotes' | 'leads' | 'notifications';
  intervalMs?: number;
}) {
  const router = useRouter();
  const revision = useRef<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      if (!document.hidden) {
        try {
          const res = await fetch(`/api/admin/revision?watch=${watch}`, { cache: 'no-store' });
          if (res.ok) {
            const { revision: next } = await res.json();
            if (revision.current === null) {
              revision.current = next;
            } else if (next !== revision.current) {
              revision.current = next;
              if (!cancelled) {
                router.refresh();
                setUpdatedAt(Date.now());
              }
            }
          }
        } catch {
          // A dropped poll is not worth surfacing; the next one will catch up.
        }
      }
      if (!cancelled) timer = setTimeout(check, intervalMs);
    };

    // A tab that has been in the background is the most likely to be stale.
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener('visibilitychange', onVisible);

    void check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [watch, intervalMs, router]);

  // Clear the badge again after a few seconds so it reads as an event.
  useEffect(() => {
    if (updatedAt === null) return;
    const t = setTimeout(() => setUpdatedAt(null), 4000);
    return () => clearTimeout(t);
  }, [updatedAt]);

  if (updatedAt === null) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/30 bg-[var(--surface)] px-4 py-2 text-[12.5px] font-medium text-emerald-400 shadow-lift"
    >
      Updated just now
    </div>
  );
}
