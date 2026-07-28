import { Search as SearchIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductCard } from '@/components/sections/ProductCard';
import { SectionHeading } from '@/components/ui/Reveal';
import { getMaterials, getProducts, getTechnologies } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search DRS 3D WORLD by product, material, technology or industry.',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === 'string' ? q.trim() : '';

  const { items, total } = query
    ? getProducts({ search: query, limit: 24 })
    : { items: [], total: 0 };

  const materials = getMaterials().slice(0, 8);
  const technologies = getTechnologies();

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Search"
          title={
            <>
              Find it <span className="text-flame">fast</span>.
            </>
          }
        />

        <form action="/search" className="mt-10 flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Try “resin”, “gearbox”, “PA-CF”, “architectural”…"
              aria-label="Search products"
              className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-[15px] text-white placeholder:text-ink-500 transition-all duration-300 focus:border-flame-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-flame-500/10"
            />
          </div>
          <button
            type="submit"
            className="h-14 rounded-2xl bg-flame-700 px-7 text-sm font-medium text-white transition-colors hover:bg-flame-800"
          >
            Search
          </button>
        </form>

        {/* Suggestions */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-ink-500">Try:</span>
          {[...technologies.map((t) => t.print_technology), ...materials.map((m) => m.material)]
            .slice(0, 10)
            .map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] text-ink-300 transition-colors hover:border-flame-500/40 hover:text-flame-400"
              >
                {term}
              </Link>
            ))}
        </div>

        {query && (
          <div className="mt-12">
            <p className="text-[13px] text-ink-400">
              {total > 0 ? (
                <>
                  <span className="text-white">{total}</span> result{total === 1 ? '' : 's'} for{' '}
                  <span className="text-white">“{query}”</span>
                </>
              ) : (
                <>
                  Nothing matched <span className="text-white">“{query}”</span>. Try a broader term,
                  or{' '}
                  <Link href="/quote" className="text-flame-500 hover:text-flame-400">
                    price your own file
                  </Link>
                  .
                </>
              )}
            </p>

            {items.length > 0 && (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
