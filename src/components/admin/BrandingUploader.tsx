'use client';

import { ImageUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { FormError, FormNotice } from '@/components/ui/Field';
import { cn } from '@/lib/cn';

type SlotPurpose = 'logo' | 'logo-light' | 'favicon';

const SETTING_KEY: Record<SlotPurpose, string> = {
  logo: 'site_logo_url',
  'logo-light': 'site_logo_light_url',
  favicon: 'site_favicon_url',
};

function Slot({
  purpose,
  title,
  description,
  current,
  previewClass,
  emptyLabel = 'Using the built-in DRS mark',
  onChanged,
}: {
  purpose: SlotPurpose;
  title: string;
  description: string;
  current: string | null;
  previewClass: string;
  emptyLabel?: string;
  onChanged: (message: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setError(null);
    setPending(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', purpose);

      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Upload failed.');
        return;
      }

      onChanged(`${title} updated — it is live on the site now.`);
      router.refresh();
    } catch {
      setError('Network problem. The file was not uploaded.');
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function clear() {
    setPending(true);
    setError(null);
    try {
      const key = SETTING_KEY[purpose];
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: '' } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not reset.');
        return;
      }
      onChanged(`${title} cleared.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[13px] font-medium text-ink-200">{title}</p>
        <p className="mt-0.5 text-[12px] text-ink-500">{description}</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          'relative flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors',
          dragging ? 'border-flame-500 bg-flame-500/[0.07]' : 'border-white/12',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
          aria-label={`Upload ${title}`}
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-800">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="" className={previewClass} />
          ) : (
            <ImageUp className="h-5 w-5 text-ink-500" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-ink-200">
            {pending ? 'Uploading…' : current ? 'Replace image' : 'Drop an image or click'}
          </span>
          <span className="block truncate font-mono text-[11px] text-ink-500">
            {current ?? emptyLabel}
          </span>
        </span>

        {current && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            aria-label={`Reset ${title}`}
            className="relative z-10 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && <FormError message={error} />}
    </div>
  );
}

export function BrandingUploader({
  logoUrl,
  logoLightUrl,
  faviconUrl,
}: {
  logoUrl: string | null;
  logoLightUrl: string | null;
  faviconUrl: string | null;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <section className="glass rounded-2xl p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">Logo &amp; favicon</h2>
      <p className="mt-1 text-[12.5px] text-ink-500">
        PNG, JPG, WEBP, SVG or ICO, up to 5 MB. Changes appear across the site and the browser tab
        as soon as they upload.
      </p>

      {notice && (
        <div className="mt-4">
          <FormNotice message={notice} />
        </div>
      )}

      <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Slot
          purpose="logo"
          title="Company logo"
          description="Shown in the header, footer and admin sidebar."
          current={logoUrl}
          previewClass="h-full w-full object-contain p-1"
          onChanged={setNotice}
        />
        <Slot
          purpose="logo-light"
          title="Logo for light theme"
          description="Optional. A lockup drawn for dark backgrounds looks like a black box on a white page — upload the light-background version here and the site swaps to it automatically."
          current={logoLightUrl}
          previewClass="h-full w-full object-contain p-1"
          emptyLabel="Falls back to the main logo"
          onChanged={setNotice}
        />
        <Slot
          purpose="favicon"
          title="Favicon"
          description="The browser tab icon. Falls back to the logo if unset."
          current={faviconUrl}
          previewClass="h-8 w-8 object-contain"
          onChanged={setNotice}
        />
      </div>
    </section>
  );
}
