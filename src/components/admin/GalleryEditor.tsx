'use client';

import { ImageUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type GalleryRow = {
  id: number;
  title: string | null;
  url: string;
  thumb_url: string | null;
  media_type: string;
  category: string | null;
  is_active: number;
};

type Draft = {
  id?: number;
  title: string;
  caption: string;
  url: string;
  mediaType: string;
  category: string;
  isActive: boolean;
};

const MEDIA_TYPES = ['image', 'video', '360', 'before_after', 'customer_photo'] as const;

const blank: Draft = { title: '', caption: '', url: '', mediaType: 'image', category: '', isActive: true };

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function GalleryEditor({ items }: { items: GalleryRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(item: GalleryRow) {
    setError(null);
    setDraft({
      id: item.id,
      title: item.title ?? '',
      caption: '',
      url: item.url,
      mediaType: item.media_type,
      category: item.category ?? '',
      isActive: item.is_active === 1,
    });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'gallery');
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      set('url', data.url);
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
      const res = await fetch('/api/admin/gallery', {
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
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/gallery?id=${id}`, { method: 'DELETE' });
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
          New item
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit gallery item' : 'New gallery item'}
            </h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close editor" className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-ink-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <div className="mt-4"><FormError message={error} /></div>}

          <div className="mt-5 rounded-xl border border-ink-800 p-4">
            <p className="text-[12.5px] font-medium text-ink-300">Image</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                {draft.url ? (
                  <Image src={draft.url} alt="" fill sizes="80px" className="object-cover" />
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
                  aria-label="Upload gallery image"
                />
                <span className="inline-flex h-10 items-center rounded-lg border border-ink-700 px-4 text-[12.5px] text-ink-200">
                  {uploading ? 'Uploading…' : 'Upload image'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Title</span>
              <input value={draft.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Category</span>
              <input value={draft.category} onChange={(e) => set('category', e.target.value)} placeholder="Statues, Engineering…" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Type</span>
              <select value={draft.mediaType} onChange={(e) => set('mediaType', e.target.value)} className={inputClass}>
                {MEDIA_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-200">
              <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-ink-600 bg-[var(--surface-sunken)] accent-flame-500" />
              Visible on the site
            </label>
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.url}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-[14px] text-ink-300">Gallery is empty — add an image above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <article key={item.id} className={cn('glass overflow-hidden rounded-2xl', item.is_active === 0 && 'opacity-60')}>
              <div className="relative aspect-[4/3] bg-ink-900">
                <Image src={item.thumb_url ?? item.url} alt={item.title ?? ''} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                <span className="on-media absolute left-2.5 top-2.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wide">
                  {item.media_type.replace(/_/g, ' ')}
                </span>
                <div className="absolute right-2 top-2 flex gap-1">
                  <button type="button" onClick={() => edit(item)} aria-label={`Edit ${item.title ?? 'item'}`} className="on-media rounded-md p-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(item.id, item.title ?? `#${item.id}`)} aria-label={`Delete ${item.title ?? 'item'}`} className="on-media rounded-md p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="truncate text-[13px] font-medium text-ink-100">{item.title ?? 'Untitled'}</p>
                {item.category && <p className="text-[11.5px] text-ink-500">{item.category}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
