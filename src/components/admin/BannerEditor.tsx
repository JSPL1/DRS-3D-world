'use client';

import { ImageUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type BannerRow = {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  placement: string;
  is_active: number;
};

type Draft = {
  id?: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaLabel: string;
  ctaHref: string;
  placement: string;
  isActive: boolean;
};

const PLACEMENTS = ['home_hero', 'home_strip', 'products_top', 'checkout_side'] as const;

const blank: Draft = {
  title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaHref: '', placement: 'home_hero', isActive: true,
};

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function BannerEditor({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(b: BannerRow) {
    setError(null);
    setDraft({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle ?? '',
      imageUrl: b.image_url ?? '',
      ctaLabel: b.cta_label ?? '',
      ctaHref: b.cta_href ?? '',
      placement: b.placement,
      isActive: b.is_active === 1,
    });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'banner');
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      set('imageUrl', data.url);
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
      const res = await fetch('/api/admin/banners', {
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

  async function remove(id: number, title: string) {
    if (!window.confirm(`Delete the banner "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/banners?id=${id}`, { method: 'DELETE' });
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
          New banner
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit banner' : 'New banner'}
            </h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-ink-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mt-4"><FormError message={error} /></div>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[12.5px] font-medium text-ink-300">Title</span>
              <input value={draft.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[12.5px] font-medium text-ink-300">Subtitle</span>
              <input value={draft.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Button label</span>
              <input value={draft.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} placeholder="Shop now" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Button link</span>
              <input value={draft.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} placeholder="/products" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Placement</span>
              <select value={draft.placement} onChange={(e) => set('placement', e.target.value)} className={inputClass}>
                {PLACEMENTS.map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-ink-800 p-4">
            <p className="text-[12.5px] font-medium text-ink-300">Banner image</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                {draft.imageUrl ? (
                  <Image src={draft.imageUrl} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <ImageUp className="absolute inset-0 m-auto h-5 w-5 text-ink-500" />
                )}
              </span>
              <div className="relative">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload banner image"
                />
                <span className="inline-flex h-10 items-center rounded-lg border border-ink-700 px-4 text-[12.5px] text-ink-200">
                  {uploading ? 'Uploading…' : 'Upload image'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-[var(--surface-sunken)] accent-flame-500" />
              Visible on the site
            </label>
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.title}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Create banner'}
            </button>
          </div>
        </div>
      )}

      {banners.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-[14px] text-ink-300">No banners yet — create one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {banners.map((banner) => (
            <article key={banner.id} className={cn('glass overflow-hidden rounded-2xl', banner.is_active === 0 && 'opacity-60')}>
              {banner.image_url && (
                <div className="relative aspect-[21/9] bg-ink-900">
                  <Image src={banner.image_url} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] text-ink-400">
                      {banner.placement}
                    </span>
                    <h2 className="mt-2 font-display text-[15px] font-semibold text-ink-100">{banner.title}</h2>
                    {banner.subtitle && <p className="mt-1 text-[12.5px] text-ink-400">{banner.subtitle}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => edit(banner)} aria-label={`Edit ${banner.title}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-500">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => remove(banner.id, banner.title)} aria-label={`Delete ${banner.title}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {banner.cta_label && (
                  <p className="mt-3 border-t border-ink-800 pt-3 text-[12px] text-ink-500">
                    Button: <span className="text-flame-400">{banner.cta_label}</span> →{' '}
                    <span className="font-mono">{banner.cta_href}</span>
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
