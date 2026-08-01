'use client';

import { Eye, ImageUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { StatusPill } from '@/components/admin/Shell';
import { FormError } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

export type BlogRow = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  category: string | null;
  status: string;
  reading_minutes: number;
  view_count: number;
  published_at: string | null;
  author_name: string | null;
};

type Draft = {
  id?: number;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  readingMinutes: string;
  status: 'draft' | 'published' | 'archived';
};

const blank: Draft = {
  title: '', excerpt: '', content: '', coverUrl: '', category: '', readingMinutes: '3', status: 'draft',
};

const inputClass =
  'h-11 w-full rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-3.5 text-[14px] text-ink-100 ' +
  'transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

export function BlogEditor({ posts }: { posts: BlogRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function edit(p: BlogRow) {
    setError(null);
    setDraft({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt ?? '',
      content: p.content ?? '',
      coverUrl: p.cover_url ?? '',
      category: p.category ?? '',
      readingMinutes: String(p.reading_minutes),
      status: p.status as Draft['status'],
    });
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', 'blog');
      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }
      set('coverUrl', data.url);
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
      const res = await fetch('/api/admin/blogs', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, readingMinutes: Number(draft.readingMinutes) || 3 }),
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
    const res = await fetch(`/api/admin/blogs?id=${id}`, { method: 'DELETE' });
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
          New post
        </button>
      </div>

      {draft && (
        <div className="glass mb-6 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              {draft.id ? 'Edit post' : 'New post'}
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
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Category</span>
              <input value={draft.category} onChange={(e) => set('category', e.target.value)} placeholder="Materials, Process, Guides…" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-ink-300">Reading time (min)</span>
              <input type="number" min={1} value={draft.readingMinutes} onChange={(e) => set('readingMinutes', e.target.value)} className={inputClass} />
            </label>
          </div>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-300">Excerpt</span>
            <textarea rows={2} value={draft.excerpt} onChange={(e) => set('excerpt', e.target.value)} className={cn(inputClass, 'h-auto py-3 leading-relaxed')} />
          </label>

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-[12.5px] font-medium text-ink-300">Content</span>
            <textarea rows={10} value={draft.content} onChange={(e) => set('content', e.target.value)} placeholder="Plain text or Markdown — paragraphs are preserved." className={cn(inputClass, 'h-auto py-3 font-mono text-[13px] leading-relaxed')} />
          </label>

          <div className="mt-5 rounded-xl border border-ink-800 p-4">
            <p className="text-[12.5px] font-medium text-ink-300">Cover image</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <span className="relative flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-800">
                {draft.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageUp className="h-5 w-5 text-ink-500" />
                )}
              </span>
              <div className="relative">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCover(f); }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Upload cover image"
                />
                <span className="inline-flex h-10 items-center rounded-lg border border-ink-700 px-4 text-[12.5px] text-ink-200">
                  {uploading ? 'Uploading…' : 'Upload cover'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[13px] text-ink-200">
              Status
              <select value={draft.status} onChange={(e) => set('status', e.target.value as Draft['status'])} className={cn(inputClass, 'h-10 w-auto')}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.title}
              className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-sm font-medium text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Create post'}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="glass rounded-2xl px-6 py-16 text-center">
          <p className="text-[14px] text-ink-300">No articles yet — write one above.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr>
                  {['Title', 'Category', 'Author', 'Status', 'Views', 'Published', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-white/5 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="max-w-sm border-b border-white/[0.04] px-6 py-3.5">
                      <span className="block truncate font-medium text-ink-100">{post.title}</span>
                      <span className="block font-mono text-[11px] text-ink-500">/{post.slug}</span>
                    </td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5 text-[13px] text-ink-400">{post.category ?? '—'}</td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5 text-[13px] text-ink-400">{post.author_name ?? '—'}</td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5"><StatusPill status={post.status} /></td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5 font-mono tabular-nums text-ink-400">{post.view_count.toLocaleString('en-IN')}</td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5 text-[12.5px] text-ink-500">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="border-b border-white/[0.04] px-6 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Link href={`/blog/${post.slug}`} target="_blank" aria-label={`View ${post.title}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-100">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button type="button" onClick={() => edit(post)} aria-label={`Edit ${post.title}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-flame-500">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => remove(post.id, post.title)} aria-label={`Delete ${post.title}`} className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
