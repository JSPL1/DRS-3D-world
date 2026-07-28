'use client';

import { Maximize2, RotateCw, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

type Img = { id: number; url: string; alt: string | null };

/**
 * Product media: a zoomable main image with thumbnails, plus a drag-to-spin
 * 360 viewer when the product has a frame set.
 */
export function ProductGallery({
  images,
  spin,
  name,
}: {
  images: Img[];
  spin: Img[];
  name: string;
}) {
  const [mode, setMode] = useState<'gallery' | '360'>('gallery');
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const has360 = spin.length > 6;
  const current = images[active] ?? images[0];

  /* ---- 360 drag handling ---- */
  const [frame, setFrame] = useState(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const accumulated = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || spin.length === 0) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;

      // Roughly one frame per 8 px of travel, wrapped into range.
      accumulated.current += dx / 8;
      const next = Math.round(accumulated.current) % spin.length;
      setFrame(next < 0 ? next + spin.length : next);
    },
    [spin.length],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Mode switch */}
      {has360 && (
        <div className="flex gap-2">
          {(['gallery', '360'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-medium transition-colors',
                mode === m
                  ? 'bg-flame-500/15 text-flame-400'
                  : 'text-ink-400 hover:bg-white/5 hover:text-white',
              )}
            >
              {m === '360' && <RotateCw className="h-3.5 w-3.5" />}
              {m === 'gallery' ? 'Photos' : '360° view'}
            </button>
          ))}
        </div>
      )}

      {/* Stage */}
      <div className="glass relative aspect-square overflow-hidden rounded-2xl bg-ink-900">
        {mode === 'gallery' ? (
          <>
            <div
              className="relative h-full w-full cursor-zoom-in"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setZoom({
                  x: ((e.clientX - rect.left) / rect.width) * 100,
                  y: ((e.clientY - rect.top) / rect.height) * 100,
                });
              }}
              onMouseLeave={() => setZoom(null)}
              onClick={() => setLightbox(true)}
            >
              <Image
                src={current.url}
                alt={current.alt ?? name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-200 ease-out"
                style={
                  zoom
                    ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                    : undefined
                }
              />
            </div>

            <button
              onClick={() => setLightbox(true)}
              aria-label="Open full size"
              className="absolute right-4 top-4 on-media rounded-lg p-2.5 backdrop-blur-sm transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div
            className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {spin[frame] && (
              <Image
                src={spin[frame].url}
                alt={`${name} — rotated view`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="pointer-events-none object-cover"
                draggable={false}
              />
            )}
            <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 on-media rounded-full px-4 py-2 text-[12px] backdrop-blur-sm">
              Drag to rotate · {Math.round((frame / spin.length) * 360)}°
            </p>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {mode === 'gallery' && images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, i) => (
            <button
              key={image.id}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                'relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-300',
                i === active
                  ? 'border-flame-500 opacity-100'
                  : 'border-transparent opacity-55 hover:opacity-100',
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} full size`}
          className="fixed inset-0 z-[100] flex items-center justify-center media-backdrop p-6 backdrop-blur-xl"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-6 top-6 rounded-lg p-3 text-white transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[85vh] w-full max-w-5xl">
            <Image
              src={current.url}
              alt={current.alt ?? name}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
