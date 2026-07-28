'use client';

import { ChevronLeft, ChevronRight, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ImageDrop, type UploadedImage } from '@/components/admin/ImageDrop';
import { FormError, FormNotice } from '@/components/ui/Field';

export type GalleryImage = { id: number; url: string; alt: string | null };

/**
 * A product's photographs: upload several at once, reorder, remove.
 *
 * Order is the whole point of the arrows — the first photograph is what
 * appears on cards, in search results and in the cart, so which one leads is a
 * merchandising decision, not an accident of upload order.
 */
export function ProductGalleryEditor({
  productId,
  initial,
}: {
  productId: number;
  initial: GalleryImage[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function addUploaded(uploaded: UploadedImage[]) {
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/admin/product-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          images: uploaded.map((u) => ({ url: u.url, alt: '' })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Those photos were uploaded but not attached.');
        return;
      }

      setNotice(`${uploaded.length} photo${uploaded.length === 1 ? '' : 's'} added.`);
      // Re-read from the server rather than guessing the new ids.
      router.refresh();
    } catch {
      setError('Network problem. The photos were not attached.');
    } finally {
      setPending(false);
    }
  }

  async function persistOrder(next: GalleryImage[]) {
    setImages(next);
    try {
      await fetch('/api/admin/product-images', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, ids: next.map((i) => i.id) }),
      });
      router.refresh();
    } catch {
      setError('Could not save the new order.');
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  async function remove(id: number) {
    setError(null);
    const previous = images;
    setImages((list) => list.filter((i) => i.id !== id));

    try {
      const res = await fetch(`/api/admin/product-images?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setImages(previous);
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not remove that photo.');
        return;
      }
      router.refresh();
    } catch {
      setImages(previous);
      setError('Network problem. The photo was not removed.');
    }
  }

  return (
    <section className="glass rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-tight">Photos</h2>
          <p className="mt-1 text-[12.5px] text-ink-500">
            The first photo is the one used on cards and in the cart. Drag files in, or click to
            browse.
          </p>
        </div>
        <span className="text-[12px] text-ink-500">
          {images.length} photo{images.length === 1 ? '' : 's'}
        </span>
      </div>

      {error && <div className="mt-4"><FormError message={error} /></div>}
      {notice && <div className="mt-4"><FormNotice message={notice} /></div>}

      <div className="mt-5">
        <ImageDrop
          purpose="product"
          multiple
          label="Drop photos here, or click to choose several"
          hint="PNG, JPG or WEBP, up to 5 MB each."
          onUploaded={addUploaded}
        />
      </div>

      {images.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-ink-900"
            >
              {/* Plain <img>: these are arbitrary uploads of unknown dimensions
                  and the optimiser buys nothing at thumbnail size. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt ?? ''} className="aspect-square w-full object-cover" />

              {index === 0 && (
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-flame-700 px-2 py-1 text-[10px] font-semibold text-white">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Main
                </span>
              )}

              <div className="flex items-center justify-between border-t border-white/10 bg-ink-950/80 px-1.5 py-1.5">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    aria-label="Move earlier"
                    className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1 || pending}
                    aria-label="Move later"
                    className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(image.id)}
                  aria-label="Remove photo"
                  className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-red-500/15 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
