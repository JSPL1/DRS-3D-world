'use client';

import { motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type Item = {
  id: number;
  title: string | null;
  caption: string | null;
  url: string;
  thumb_url: string | null;
  media_type: string;
  category: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Masonry gallery. Uses CSS columns rather than a JS layout pass, so items
 * settle immediately and nothing reflows as images decode.
 */
export function GalleryGrid({ items }: { items: Item[] }) {
  const [active, setActive] = useState<Item | null>(null);

  if (items.length === 0) {
    return (
      <p className="py-20 text-center text-[14px] text-ink-400">
        Nothing here yet in this category.
      </p>
    );
  }

  return (
    <>
      <div className="columns-2 gap-4 [column-fill:_balance] md:columns-3 lg:columns-4">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            onClick={() => setActive(item)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8%' }}
            transition={{ duration: 0.6, delay: Math.min(i * 0.02, 0.4), ease: [0.16, 1, 0.3, 1] }}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl bg-ink-900 text-left"
            style={{ aspectRatio: `${item.width ?? 4} / ${item.height ?? 3}` }}
          >
            <Image
              src={item.thumb_url ?? item.url}
              alt={item.title ?? 'Gallery image'}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
            />

            <span className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,6,0.85)] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {item.media_type === 'video' && (
              <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-flame-500/90 text-white">
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </span>
            )}

            {item.title && (
              <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-[13px] font-medium text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                {item.title}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title ?? 'Gallery image'}
          className="fixed inset-0 z-[100] flex items-center justify-center media-backdrop p-6 backdrop-blur-xl"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            aria-label="Close"
            className="absolute right-6 top-6 rounded-lg p-3 text-white transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>

          <figure className="relative max-h-[88vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-[76vh]">
              <Image
                src={active.url}
                alt={active.title ?? ''}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
            {(active.title || active.caption) && (
              <figcaption className="mt-4 text-center">
                <p className="font-display text-lg font-semibold text-white">{active.title}</p>
                {active.caption && active.caption !== active.title && (
                  <p className="mt-1 text-[13px] text-ink-400">{active.caption}</p>
                )}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
