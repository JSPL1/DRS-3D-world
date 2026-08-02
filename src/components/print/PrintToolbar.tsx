'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { CHALLAN_SIZES, type ChallanSize } from '@/lib/print-sizes';

/**
 * Screen-only controls. `print:hidden` keeps them off the paper, so what the
 * admin previews is exactly what comes out of the printer.
 */
export function PrintToolbar({ doc, size }: { doc: 'challan' | 'order'; size: ChallanSize }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="print:hidden sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-3 border-b border-ink-800 bg-[var(--surface)] px-5 py-3">
      <Link
        href="/admin/orders"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Orders
      </Link>

      <div className="flex rounded-lg border border-ink-700 p-0.5">
        {(['challan', 'order'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setParam('doc', d)}
            className={`h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors ${
              doc === d ? 'bg-flame-700 text-white' : 'text-ink-300 hover:text-ink-100'
            }`}
          >
            {d === 'challan' ? 'Delivery challan' : 'Order sheet'}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-[12.5px] text-ink-400">
        Paper
        <select
          value={size}
          onChange={(e) => setParam('size', e.target.value)}
          className="h-9 rounded-lg border border-ink-700 bg-[var(--surface-sunken)] px-2.5 text-[12.5px] text-ink-100 focus:border-flame-500/60 focus:outline-none"
        >
          {CHALLAN_SIZES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-flame-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-flame-800"
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  );
}
