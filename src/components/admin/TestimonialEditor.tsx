'use client';

import { ImageUp, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type TestimonialRow = {
  id: number;
  author_name: string;
  author_role: string | null;
  company: string | null;
  avatar_url: string | null;
  quote: string;
  rating: number;
  is_featured: number;
  is_active: number;
};

export type CustomerOption = { id: number; name: string; email: string; avatar_url: string | null };

type Draft = {
  id?: number;
  authorName: string;
  authorRole: string;
  company: string;
  quote: string;
  rating: number;
  avatarUrl: string;
  isFeatured: boolean;
  isActive: boolean;
  linkedUserId: number | null;
};

const blank: Draft = {
  authorName: '', authorRole: '', company: '', quote: '', rating: 5,
  avatarUrl: '', isFeatured: false, isActive: true, linkedUserId: null,
};

const inputClass =
  'h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[14px] ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function TestimonialEditor({
  testimonials,
  customers,
}: {
  testimonials: TestimonialRow[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(t: TestimonialRow) {
    setError(null);
    setDraft({
      id: t.id,
      authorName: t.author_name,
      authorRole: t.author_role ?? '',
      company: t.company ?? '',
      quote: t.quote,
      rating: t.rating,
      avatarUrl: t.avatar_url ?? '',
      isFeatured: t.is_featured === 1,
      isActive: t.is_active === 1,
      linkedUserId: null,
    });
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'testimonial');

      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      set('avatarUrl', data.url);
      set('linkedUserId', null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    if (!draft) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/testimonials', {
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
    if (!window.confirm(`Delete the testimonial from ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/testimonials?id=${id}`, { method: 'DELETE' });
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
          New testimonial
        </button>
      </div>

      {/* Editor */}
      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit testimonial' : 'New testimonial'}
            </h2>
            <button
              type="button"
              onClick={() => setDraft(null)}
              aria-label="Close editor"
              className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mt-4"><FormError message={error} /></div>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Name</span>
              <input value={draft.authorName} onChange={(e) => set('authorName', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Role</span>
              <input value={draft.authorRole} onChange={(e) => set('authorRole', e.target.value)} className={inputClass} placeholder="Head of Production" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Company</span>
              <input value={draft.company} onChange={(e) => set('company', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Rating</span>
              <select value={draft.rating} onChange={(e) => set('rating', Number(e.target.value))} className={inputClass}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-300">Quote</span>
            <textarea
              rows={4}
              value={draft.quote}
              onChange={(e) => set('quote', e.target.value)}
              className={`${inputClass} h-auto py-3 leading-relaxed`}
            />
          </label>

          {/* Photo: upload, or take it from a registered customer */}
          <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[12.5px] font-medium text-ink-300">Customer photo</p>

            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-ink-800">
                {draft.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageUp className="absolute inset-0 m-auto h-5 w-5 text-ink-500" />
                )}
              </span>

              <div className="relative">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload customer photo"
                />
                <span className="inline-flex h-10 items-center rounded-lg border border-white/12 px-4 text-[12.5px]">
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </span>
              </div>

              {customers.length > 0 && (
                <label className="flex items-center gap-2 text-[12.5px] text-ink-400">
                  or use a customer&apos;s
                  <select
                    value={draft.linkedUserId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : null;
                      set('linkedUserId', id);
                      const c = customers.find((x) => x.id === id);
                      if (c?.avatar_url) set('avatarUrl', c.avatar_url);
                    }}
                    className="h-10 rounded-lg border border-white/10 bg-ink-900 px-3 text-[12.5px]"
                  >
                    <option value="">Select customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.avatar_url ? '' : ' (no photo)'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <input
              value={draft.avatarUrl}
              onChange={(e) => set('avatarUrl', e.target.value)}
              placeholder="/uploads/… or leave blank"
              className="mt-3 h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-[12px]"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-flame-500" />
              Featured (shows first on the homepage)
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-flame-500" />
              Visible on the site
            </label>

            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Add testimonial'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {testimonials.map((t) => (
          <article key={t.id} className={cn('glass rounded-2xl p-5', t.is_active === 0 && 'opacity-60')}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }, (_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
                ))}
                {t.is_featured === 1 && (
                  <span className="ml-2 rounded bg-flame-700/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-flame-500">
                    Featured
                  </span>
                )}
                {t.is_active === 0 && (
                  <span className="ml-2 rounded bg-ink-600/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-300">
                    Hidden
                  </span>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => edit(t)} aria-label={`Edit ${t.author_name}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-500">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => remove(t.id, t.author_name)} aria-label={`Delete ${t.author_name}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <blockquote className="mt-3 text-[13.5px] leading-relaxed text-ink-200">“{t.quote}”</blockquote>

            <div className="mt-4 flex items-center gap-3 border-t border-white/5 pt-3.5">
              {t.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              )}
              <p className="text-[12.5px] text-ink-400">
                <span className="font-medium text-ink-100">{t.author_name}</span>
                {[t.author_role, t.company].filter(Boolean).length > 0 && (
                  <span> · {[t.author_role, t.company].filter(Boolean).join(', ')}</span>
                )}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
