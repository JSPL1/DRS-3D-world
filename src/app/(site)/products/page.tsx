import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductCard } from '@/components/sections/ProductCard';
import { RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { getCurrentUser } from '@/lib/auth/session';
import { cn } from '@/lib/cn';
import { all } from '@/lib/db';
import {
  getCategories, getColorCounts, getMaterials, getProducts, getTechnologies,
  type ProductFilters,
} from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'Statues, lamps, engineering parts, prototypes, architectural and medical models — everything DRS 3D WORLD prints, with prices.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most viewed' },
  { value: 'rating', label: 'Best rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Rebuilds the current query string with one key changed. */
function buildHref(
  current: Record<string, string | string[] | undefined>,
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'string' && value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  params.delete('page');
  const qs = params.toString();
  return qs ? `/products?${qs}` : '/products';
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const str = (key: string) => (typeof params[key] === 'string' ? (params[key] as string) : undefined);

  const page = Math.max(1, Number(str('page') ?? 1) || 1);
  const sort = (str('sort') ?? 'newest') as NonNullable<ProductFilters['sort']>;

  const filters: ProductFilters = {
    category: str('category'),
    material: str('material'),
    technology: str('technology'),
    search: str('q'),
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const { items, total } = await getProducts(filters);
  const colorCounts = await getColorCounts();
  const categories = await getCategories();
  const materials = await getMaterials();
  const technologies = await getTechnologies();

  const user = await getCurrentUser();
  const wishlisted = user
    ? new Set(
        (await all<{ product_id: number }>(`SELECT product_id FROM wishlists WHERE user_id = ?`, [user.id]))
          .map((r) => r.product_id),
      )
    : new Set<number>();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCategory = str('category');

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Products"
          title={
            <>
              Everything we make,
              <br />
              <span className="text-flame">priced openly</span>.
            </>
          }
          lead="Made-to-order pieces and standing services. If what you need is not here, the quote calculator will price your own file in seconds."
        />

        {/* Category rail */}
        <div className="mt-12 flex gap-2.5 overflow-x-auto pb-2">
          <Link
            href={buildHref(params, { category: undefined })}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-300',
              !activeCategory
                ? 'border-ink-100 bg-ink-100 text-ink-950'
                : 'border-ink-800 text-ink-400 hover:border-flame-500/40 hover:text-flame-700',
            )}
          >
            All ({total})
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={buildHref(params, { category: cat.slug })}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-all duration-300',
                activeCategory === cat.slug
                  ? 'border-ink-100 bg-ink-100 text-ink-950'
                  : 'border-ink-800 text-ink-400 hover:border-flame-500/40 hover:text-flame-700',
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Filters */}
          <aside className="flex flex-col gap-7 rounded-[22px] border border-ink-800 bg-[var(--surface)] p-5 lg:sticky lg:top-28 lg:self-start">
            <FilterGroup
              title="Technology"
              options={technologies.map((t) => ({ value: t.print_technology, label: t.print_technology, count: t.c }))}
              activeValue={str('technology')}
              paramKey="technology"
              params={params}
            />
            <FilterGroup
              title="Material"
              options={materials.map((m) => ({ value: m.material, label: m.material, count: m.c }))}
              activeValue={str('material')}
              paramKey="material"
              params={params}
            />
          </aside>

          {/* Results */}
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[13px] text-ink-400">
                Showing <span className="font-semibold text-ink-100">{items.length}</span> of{' '}
                <span className="font-semibold text-ink-100">{total}</span> products
              </p>

              <div className="flex flex-wrap gap-2">
                {SORTS.map((option) => (
                  <Link
                    key={option.value}
                    href={buildHref(params, { sort: option.value })}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                      sort === option.value
                        ? 'bg-flame-700/12 text-flame-700'
                        : 'text-ink-400 hover:text-ink-100',
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="glass flex flex-col items-center rounded-2xl px-6 py-20 text-center">
                <p className="font-display text-xl font-semibold">Nothing matches those filters</p>
                <p className="mt-2 max-w-sm text-[14px] text-ink-400">
                  Try clearing one of them — or send us your own file and we will quote it directly.
                </p>
                <Link
                  href="/products"
                  className="mt-6 rounded-xl border border-flame-500/40 px-5 py-2.5 text-[13px] font-medium text-flame-400 transition-colors hover:bg-flame-500/10"
                >
                  Clear all filters
                </Link>
              </div>
            ) : (
              <RevealGroup className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((product, i) => (
                  <RevealItem key={product.id}>
                    <ProductCard
                      product={product}
                      priority={i < 3}
                      colorCount={colorCounts[product.id] ?? 0}
                      wishlisted={wishlisted.has(product.id)}
                      signedIn={Boolean(user)}
                    />
                  </RevealItem>
                ))}
              </RevealGroup>
            )}

            {totalPages > 1 && (
              <nav className="mt-12 flex justify-center gap-2" aria-label="Pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                  const qs = new URLSearchParams();
                  for (const [key, value] of Object.entries(params)) {
                    if (typeof value === 'string' && value && key !== 'page') qs.set(key, value);
                  }
                  if (n > 1) qs.set('page', String(n));
                  const href = qs.toString() ? `/products?${qs}` : '/products';

                  return (
                    <Link
                      key={n}
                      href={href}
                      aria-current={n === page ? 'page' : undefined}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg text-[13px] font-bold transition-colors',
                        n === page
                          ? 'bg-ink-100 text-ink-950'
                          : 'border border-ink-800 text-ink-400 hover:border-flame-500/40 hover:text-flame-700',
                      )}
                    >
                      {n}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  activeValue,
  paramKey,
  params,
}: {
  title: string;
  options: Array<{ value: string; label: string; count: number }>;
  activeValue?: string;
  paramKey: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (options.length === 0) return null;

  return (
    <div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">{title}</h3>
      <ul className="mt-4 space-y-1">
        {options.map((option) => {
          const active = activeValue === option.value;
          return (
            <li key={option.value}>
              <Link
                href={buildHref(params, { [paramKey]: active ? undefined : option.value })}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
                  active ? 'bg-flame-700/12 text-flame-700' : 'text-ink-400 hover:bg-ink-900 hover:text-ink-100',
                )}
              >
                <span className="truncate">{option.label}</span>
                <span className="ml-2 shrink-0 text-[11px] text-ink-500">{option.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
