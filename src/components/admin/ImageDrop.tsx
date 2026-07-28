'use client';

import { ImageUp, Loader2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

export type UploadedImage = { url: string; name: string };

/**
 * Drag, drop or browse — the one upload control the panel uses.
 *
 * Everywhere a picture is needed, the same three things have to work: dropping
 * a file, clicking to open the file browser, and seeing which of a batch
 * failed. Writing that three times produced three subtly different behaviours,
 * so it lives here and the callers only say what to do with the URLs.
 */
export function ImageDrop({
  purpose,
  multiple = false,
  label,
  hint,
  compact = false,
  onUploaded,
}: {
  /** Grouping for the media library, and the uploaded file's name prefix. */
  purpose: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  /** Renders as a single button-height row rather than a drop panel. */
  compact?: boolean;
  onUploaded: (images: UploadedImage[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) {
      setError('Those files are not images.');
      return;
    }

    setError(null);
    setPending(list.length);

    const done: UploadedImage[] = [];
    const failed: string[] = [];

    // Sequential, not Promise.all: a batch of a dozen 4 MB photographs sent at
    // once is what makes a small host start refusing them.
    for (const file of list) {
      try {
        const body = new FormData();
        body.append('file', file);
        body.append('purpose', purpose);

        const res = await fetch('/api/admin/upload', { method: 'POST', body });
        const data = await res.json();

        if (res.ok && data.url) done.push({ url: data.url, name: file.name });
        else failed.push(`${file.name} — ${data.error ?? 'upload failed'}`);
      } catch {
        failed.push(`${file.name} — network problem`);
      } finally {
        setPending((n) => n - 1);
      }
    }

    if (done.length > 0) onUploaded(done);
    if (failed.length > 0) setError(failed.join(' · '));
    if (inputRef.current) inputRef.current.value = '';
  }

  const busy = pending > 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
        }}
        className={cn(
          'relative flex items-center gap-3 rounded-xl border-2 border-dashed transition-colors',
          compact ? 'px-3.5 py-2.5' : 'flex-col justify-center px-4 py-8 text-center',
          dragging ? 'border-flame-500 bg-flame-500/[0.07]' : 'border-white/12 hover:border-white/25',
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={multiple}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={busy}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-wait"
          onChange={(e) => {
            if (e.target.files?.length) void upload(e.target.files);
          }}
        />

        {busy ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-flame-500" />
        ) : (
          <ImageUp className={cn('shrink-0 text-ink-500', compact ? 'h-4 w-4' : 'h-6 w-6')} />
        )}

        <span className={compact ? 'min-w-0 flex-1' : ''}>
          <span className="block text-[13px] font-medium text-ink-200">
            {busy
              ? `Uploading ${pending} file${pending === 1 ? '' : 's'}…`
              : label}
          </span>
          {hint && <span className="mt-0.5 block text-[11.5px] text-ink-500">{hint}</span>}
        </span>
      </div>

      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
