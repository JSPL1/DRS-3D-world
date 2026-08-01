'use client';

import { ImageUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type VideoRow = {
  id: number;
  title: string;
  description: string | null;
  thumb_url: string | null;
  youtube_url: string | null;
  duration_sec: number | null;
  category: string | null;
  is_active: number;
};

type Draft = {
  id?: number;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbUrl: string;
  durationSec: string;
  category: string;
  isActive: boolean;
};

const blank: Draft = { title: '', description: '', youtubeUrl: '', thumbUrl: '', durationSec: '', category: '', isActive: true };

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function VideoEditor({ videos }: { videos: VideoRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(v: VideoRow) {
    setError(null);
    setDraft({
      id: v.id,
      title: v.title,
      description: v.description ?? '',
      youtubeUrl: v.youtube_url ?? '',
      thumbUrl: v.thumb_url ?? '',
      durationSec: v.duration_sec ? String(v.duration_sec) : '',
      category: v.category ?? '',
      isActive: v.is_active === 1,
    });
  }

  async function uploadThumb(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'video');
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      set('thumbUrl', data.url);
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
      const res = await fetch('/api/admin/videos', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, durationSec: draft.durationSec ? Number(draft.durationSec) : null }),
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
    const res = await fetch(`/api/admin/videos?id=${id}`, { method: 'DELETE' });
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
          New video
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit video' : 'New video'}
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
              <span className="text-[12.5px] font-medium text-ink-300">YouTube URL</span>
              <input value={draft.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Category</span>
              <input value={draft.category} onChange={(e) => set('category', e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Duration (seconds)</span>
              <input type="number" min={0} value={draft.durationSec} onChange={(e) => set('durationSec', e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-300">Description</span>
            <textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} className={cn(inputClass, 'h-auto py-3 leading-relaxed')} />
          </label>

          <div className="mt-5 rounded-xl border border-ink-800 p-4">
            <p className="text-[12.5px] font-medium text-ink-300">Thumbnail</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-ink-800">
                {draft.thumbUrl ? (
                  <Image src={draft.thumbUrl} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <ImageUp className="absolute inset-0 m-auto h-5 w-5 text-ink-500" />
                )}
              </span>
              <div className="relative">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadThumb(f); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload thumbnail"
                />
                <span className="inline-flex h-10 items-center rounded-lg border border-ink-700 px-4 text-[12.5px] text-ink-200">
                  {uploading ? 'Uploading…' : 'Upload thumbnail'}
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
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Add video'}
            </button>
          </div>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-[14px] text-ink-300">No videos yet — add one above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article key={video.id} className={cn('glass overflow-hidden rounded-2xl', video.is_active === 0 && 'opacity-60')}>
              <div className="relative aspect-video bg-ink-900">
                {video.thumb_url && (
                  <Image src={video.thumb_url} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                )}
                {video.duration_sec ? (
                  <span className="on-media absolute bottom-2.5 right-2.5 rounded-md px-2 py-1 font-mono text-[11px]">
                    {Math.floor(video.duration_sec / 60)}:{String(video.duration_sec % 60).padStart(2, '0')}
                  </span>
                ) : null}
                <div className="absolute right-2 top-2 flex gap-1">
                  <button type="button" onClick={() => edit(video)} aria-label={`Edit ${video.title}`} className="on-media rounded-md p-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(video.id, video.title)} aria-label={`Delete ${video.title}`} className="on-media rounded-md p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {video.category && (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-flame-500">{video.category}</p>
                )}
                <h2 className="mt-1 text-[13.5px] font-medium leading-snug text-ink-100">{video.title}</h2>
                {video.description && <p className="mt-2 line-clamp-2 text-[12.5px] text-ink-400">{video.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
