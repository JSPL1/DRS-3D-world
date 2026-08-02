import type { Metadata } from 'next';
import Link from 'next/link';

import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { SectionHeading } from '@/components/ui/Reveal';
import { cn } from '@/lib/cn';
import { getGalleryCategories, getGalleryItems } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Gallery',
  description: 'Work from the DRS 3D WORLD floor — statues, models, engineering parts and prints in progress.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const items = await getGalleryItems(60, category);
  const categories = await getGalleryCategories();

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Gallery"
          title={
            <>
              From the <span className="text-flame">floor</span>.
            </>
          }
          lead="Finished pieces, work in progress, and the unglamorous middle bit nobody photographs."
        />

        <div className="mt-10 flex flex-wrap gap-2.5">
          <Link
            href="/gallery"
            className={cn(
              'rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-300',
              !category
                ? 'border-flame-500 bg-flame-700 text-white'
                : 'border-white/8 bg-white/[0.03] text-ink-300 hover:border-flame-500/40 hover:text-flame-400',
            )}
          >
            Everything
          </Link>
          {categories.map((c) => (
            <Link
              key={c.category}
              href={`/gallery?category=${encodeURIComponent(c.category)}`}
              className={cn(
                'rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-300',
                category === c.category
                  ? 'border-flame-500 bg-flame-700 text-white'
                  : 'border-white/8 bg-white/[0.03] text-ink-300 hover:border-flame-500/40 hover:text-flame-400',
              )}
            >
              {c.category}
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <GalleryGrid items={items} />
        </div>
      </div>
    </div>
  );
}
