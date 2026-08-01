'use client';

import { Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type ReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_approved: number;
  created_at: string;
  product_name: string | null;
  product_id?: number;
};

export type ProductOption = { id: number; name: string };

type Draft = {
  id?: number;
  productId: number | null;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
};

const blank: Draft = { productId: null, authorName: '', rating: 5, title: '', body: '', isApproved: true };

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function ReviewEditor({ reviews, products }: { reviews: ReviewRow[]; products: ProductOption[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(r: ReviewRow) {
    setError(null);
    setDraft({
      id: r.id,
      productId: r.product_id ?? null,
      authorName: r.author_name,
      rating: r.rating,
      title: r.title ?? '',
      body: r.body ?? '',
      isApproved: r.is_approved === 1,
    });
  }

  async function save() {
    if (!draft || !draft.productId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
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

  async function remove(id: number, name: string) {
    if (!window.confirm(`Delete the review by ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/reviews?id=${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
  }

  const pending2 = reviews.filter((r) => r.is_approved === 0).length;

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] text-ink-400">
          {pending2 > 0
            ? `${pending2} awaiting approval — only approved reviews appear on the website.`
            : 'Everything is approved. Only approved reviews appear on the website.'}
        </p>
        <button
          type="button"
          onClick={() => { setError(null); setDraft({ ...blank }); }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800"
        >
          <Plus className="h-4 w-4" />
          New review
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit review' : 'New review'}
            </h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-ink-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mt-4"><FormError message={error} /></div>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[12.5px] font-medium text-ink-300">Product</span>
              <select
                value={draft.productId ?? ''}
                onChange={(e) => set('productId', e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Reviewer name</span>
              <input value={draft.authorName} onChange={(e) => set('authorName', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Rating</span>
              <select value={draft.rating} onChange={(e) => set('rating', Number(e.target.value))} className={inputClass}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[12.5px] font-medium text-ink-300">Title (optional)</span>
              <input value={draft.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-300">Review text</span>
            <textarea rows={3} value={draft.body} onChange={(e) => set('body', e.target.value)} className={cn(inputClass, 'h-auto py-3 leading-relaxed')} />
          </label>

          <div className="mt-5 flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isApproved} onChange={(e) => set('isApproved', e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-[var(--surface-sunken)] accent-flame-500" />
              Approved (visible on the site)
            </label>
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.productId || !draft.authorName}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Add review'}
            </button>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-[14px] text-ink-300">No reviews yet — add one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reviews.map((review) => (
            <article key={review.id} className={cn('glass rounded-2xl p-5', review.is_approved === 0 && 'border-flame-500/25')}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }, (_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
                    ))}
                  </div>
                  {review.title && <h2 className="mt-2 font-display text-[15px] font-semibold text-ink-100">{review.title}</h2>}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <ToggleSwitch
                    entity="review"
                    id={review.id}
                    value={review.is_approved === 1}
                    label={`Approve review by ${review.author_name}`}
                    onLabel="Live"
                    offLabel="Hidden"
                    showState={false}
                  />
                  <button type="button" onClick={() => edit(review)} aria-label={`Edit review by ${review.author_name}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-500">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(review.id, review.author_name)} aria-label={`Delete review by ${review.author_name}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {review.body && <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">{review.body}</p>}

              <div className="mt-4 flex items-center justify-between border-t border-ink-800 pt-3.5 text-[12px]">
                <span className="text-ink-400">
                  {review.author_name}
                  {review.product_name && <span className="text-ink-500"> · {review.product_name}</span>}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
