'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type CouponRow = {
  id: number;
  code: string;
  description: string | null;
  type: string;
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: number;
};

type Draft = {
  id?: number;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: string;
  minOrder: string;
  maxDiscount: string;
  usageLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const blank: Draft = {
  code: '', description: '', type: 'percent', value: '', minOrder: '0',
  maxDiscount: '', usageLimit: '', startsAt: '', expiresAt: '', isActive: true,
};

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

/** ISO datetime → the value a <input type="date"> input needs. */
function toDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function CouponEditor({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(c: CouponRow) {
    setError(null);
    setDraft({
      id: c.id,
      code: c.code,
      description: c.description ?? '',
      type: c.type as 'percent' | 'fixed',
      value: String(c.value),
      minOrder: String(c.min_order),
      maxDiscount: c.max_discount ? String(c.max_discount) : '',
      usageLimit: c.usage_limit ? String(c.usage_limit) : '',
      startsAt: toDateInput(c.starts_at),
      expiresAt: toDateInput(c.expires_at),
      isActive: c.is_active === 1,
    });
  }

  async function save() {
    if (!draft) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          code: draft.code,
          description: draft.description,
          type: draft.type,
          value: Number(draft.value) || 0,
          minOrder: Number(draft.minOrder) || 0,
          maxDiscount: draft.maxDiscount ? Number(draft.maxDiscount) : null,
          usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
          startsAt: draft.startsAt || '',
          expiresAt: draft.expiresAt || '',
          isActive: draft.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save.');
        return;
      }
      setDraft(null);
      router.refresh();
    } catch {
      setError('Network problem. Nothing was saved.');
    } finally {
      setPending(false);
    }
  }

  async function remove(id: number, code: string) {
    if (!window.confirm(`Delete the coupon ${code}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={() => { setError(null); setDraft({ ...blank }); }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800"
        >
          <Plus className="h-4 w-4" />
          New coupon
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit coupon' : 'New coupon'}
            </h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-ink-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mt-4"><FormError message={error} /></div>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Code</span>
              <input
                value={draft.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="FESTIVE500"
                className={cn(inputClass, 'font-mono uppercase')}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Description</span>
              <input value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Festive season offer" className={inputClass} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Discount type</span>
              <select value={draft.type} onChange={(e) => set('type', e.target.value as 'percent' | 'fixed')} className={inputClass}>
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">
                Value {draft.type === 'percent' ? '(%)' : '(₹)'}
              </span>
              <input type="number" min={0} value={draft.value} onChange={(e) => set('value', e.target.value)} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Minimum order (₹)</span>
              <input type="number" min={0} value={draft.minOrder} onChange={(e) => set('minOrder', e.target.value)} className={inputClass} />
            </label>
            {draft.type === 'percent' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] font-medium text-ink-300">Max discount (₹, optional)</span>
                <input type="number" min={0} value={draft.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" className={inputClass} />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Usage limit (optional)</span>
              <input type="number" min={1} value={draft.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" className={inputClass} />
            </label>
            <div />

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Starts (optional)</span>
              <input type="date" value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Expires (optional)</span>
              <input type="date" value={draft.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} className={inputClass} />
            </label>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-[var(--surface-sunken)] accent-flame-500" />
              Active
            </label>

            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.code || !draft.value}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Create coupon'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {coupons.map((c) => {
          const expired = c.expires_at ? new Date(c.expires_at.replace(' ', 'T') + 'Z') < new Date() : false;
          return (
            <article key={c.id} className={cn('glass rounded-2xl p-5', c.is_active === 0 && 'opacity-60')}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-mono text-[15px] font-bold text-ink-100">{c.code}</span>
                  {c.description && <p className="mt-0.5 text-[12.5px] text-ink-500">{c.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => edit(c)} aria-label={`Edit ${c.code}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-500">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(c.id, c.code)} aria-label={`Delete ${c.code}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="mt-3 font-display text-lg font-bold text-flame-500">
                {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
                {c.max_discount ? <span className="ml-1.5 text-[12px] font-normal text-ink-500">up to ₹{c.max_discount}</span> : null}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-500">
                {c.min_order > 0 && <span>Min order ₹{c.min_order}</span>}
                <span>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''} used</span>
                <span className={expired ? 'text-red-400' : ''}>
                  {c.expires_at ? `Expires ${toDateInput(c.expires_at)}` : 'No expiry'}
                </span>
                {!c.is_active && <span className="text-ink-400">Inactive</span>}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
