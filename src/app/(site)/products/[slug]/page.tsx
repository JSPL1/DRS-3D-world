import {
  Box, Check, Clock, Download, Layers, Palette,
  RotateCcw, Ruler, ShieldCheck, Star, Truck, Weight,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ProductPurchasePanel } from '@/components/products/ProductPurchasePanel';
import { ProductCard } from '@/components/sections/ProductCard';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';
import {
  getAllProductSlugs, getProductBySlug, getProductColors, getProductImages,
  getProductReviews, getRelatedProducts,
} from '@/lib/queries';
import { site } from '@/lib/site';

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return getAllProductSlugs().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'Product not found' };

  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.short_description ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.short_description ?? '',
      images: product.thumb ? [{ url: product.thumb }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const gallery = getProductImages(product.id, 'gallery');
  const spin = getProductImages(product.id, '360');
  const related = getRelatedProducts(product.id, 3);
  const reviews = getProductReviews(product.id);
  const colors = getProductColors(product.id);

  const specs = [
    { icon: Ruler, label: 'Dimensions', value: product.length_mm ? `${product.length_mm} × ${product.width_mm} × ${product.height_mm} mm` : null },
    { icon: Weight, label: 'Weight', value: product.weight_g ? `${product.weight_g} g` : null },
    { icon: Box, label: 'Material', value: product.material },
    { icon: Layers, label: 'Technology', value: product.print_technology },
    { icon: Clock, label: 'Print time', value: product.print_time_hours ? `${product.print_time_hours} hours` : null },
    { icon: Layers, label: 'Layer height', value: product.layer_height_mm ? `${product.layer_height_mm} mm` : null },
    { icon: Palette, label: 'Finish', value: product.color },
    { icon: Box, label: 'Infill', value: product.infill_percent ? `${product.infill_percent}%` : null },
  ].filter((s) => s.value);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.short_description,
    image: product.thumb ? [`${site.url}${product.thumb}`] : undefined,
    brand: { '@type': 'Brand', name: product.brand_name ?? site.name },
    offers: {
      '@type': 'Offer',
      price: product.effectivePrice,
      priceCurrency: 'INR',
      availability:
        product.availability === 'in_stock'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
      url: `${site.url}/products/${product.slug}`,
    },
    ...(product.rating_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating_avg,
        reviewCount: product.rating_count,
      },
    }),
  };

  return (
    <div className="pb-24 pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[13px] text-ink-400">
          <Link href="/" className="transition-colors hover:text-white">Home</Link>
          <span className="text-ink-500">/</span>
          <Link href="/products" className="transition-colors hover:text-white">Products</Link>
          {product.category_slug && (
            <>
              <span className="text-ink-500">/</span>
              <Link
                href={`/products?category=${product.category_slug}`}
                className="transition-colors hover:text-white"
              >
                {product.category_name}
              </Link>
            </>
          )}
        </nav>

        {/* Title block sits above the buy panel so the name and rating read
            first on mobile, before the gallery pushes everything down. */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2.5">
            {product.is_best_seller && (
              <span className="rounded-full bg-flame-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Best seller
              </span>
            )}
            {product.is_new_arrival && (
              <span className="rounded-full border border-flame-500/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-flame-500">
                New
              </span>
            )}
            <span className="font-mono text-[11px] text-ink-500">{product.sku}</span>
          </div>

          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight lg:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            {product.rating_count > 0 && (
              <a href="#reviews" className="flex items-center gap-2 transition-opacity hover:opacity-80">
                <span className="flex">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.round(product.rating_avg)
                          ? 'fill-flame-500 text-flame-500'
                          : 'text-ink-500'
                      }`}
                    />
                  ))}
                </span>
                <span className="text-[13px] text-ink-400">
                  {product.rating_avg.toFixed(1)} · {product.rating_count} reviews
                </span>
              </a>
            )}
            {product.category_name && (
              <Link
                href={`/products?category=${product.category_slug}`}
                className="text-[13px] text-ink-400 transition-colors hover:text-flame-500"
              >
                in {product.category_name}
              </Link>
            )}
          </div>

          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-200">
            {product.short_description}
          </p>
        </div>

        {/* Gallery + buy box. Colour selection lives in the panel so choosing
            a finish can swap the photograph. */}
        <ProductPurchasePanel
          productId={product.id}
          slug={product.slug}
          name={product.name}
          basePrice={product.effectivePrice}
          listPrice={product.discount_price ? product.price : null}
          images={gallery}
          spin={spin}
          colors={colors}
          inStock={product.availability === 'in_stock' && product.stock > 0}
          madeToOrder={product.availability === 'made_to_order'}
        />

        {/* Reassurance strip — the questions every shopper has before paying */}
        <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3">
          {[
            { icon: Truck, title: 'Free delivery over ₹10,000', body: 'Across India. Local delivery in Bhubaneswar.' },
            { icon: ShieldCheck, title: 'Printed to order', body: 'We confirm colour and finish before printing.' },
            { icon: RotateCcw, title: 'Reprint on defects', body: 'If it arrives flawed, we print it again.' },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 bg-ink-950 p-5">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-flame-500" />
              <div>
                <p className="text-[13.5px] font-semibold">{item.title}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Specs + features */}
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {specs.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">At a glance</h2>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06]">
                {specs.map((spec) => (
                  <div key={spec.label} className="bg-ink-950 p-4">
                    <dt className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-500">
                      <spec.icon className="h-3.5 w-3.5" />
                      {spec.label}
                    </dt>
                    <dd className="mt-1.5 text-[14px] font-medium">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.features.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">What you get</h2>
              <ul className="mt-4 space-y-2.5">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[14px] text-ink-200">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              {product.brochure_url && (
                <a
                  href={product.brochure_url}
                  className="mt-6 inline-flex items-center gap-2 text-[13px] text-ink-300 transition-colors hover:text-flame-500"
                >
                  <Download className="h-4 w-4" />
                  Download the brochure (PDF)
                </a>
              )}
            </div>
          )}
        </div>

        {/* Description + specifications */}
        <div className="mt-20 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">About this piece</h2>
            <p className="mt-5 whitespace-pre-line text-[15px] leading-[1.75] text-ink-200">
              {product.description}
            </p>
          </div>

          {product.specifications.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Specifications</h2>
              <dl className="mt-5 divide-y divide-white/5">
                {product.specifications.map((spec) => (
                  <div key={spec.label} className="flex justify-between gap-4 py-3.5">
                    <dt className="text-[13.5px] text-ink-400">{spec.label}</dt>
                    <dd className="text-right text-[13.5px] font-medium text-white">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section id="reviews" className="mt-20 scroll-mt-28">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              What buyers said
            </h2>
            <RevealGroup className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <RevealItem key={review.id}>
                  <figure className="glass h-full rounded-2xl p-6">
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }, (_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
                      ))}
                    </div>
                    {review.title && (
                      <p className="mt-4 font-display text-[15px] font-semibold">{review.title}</p>
                    )}
                    <blockquote className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                      {review.body}
                    </blockquote>
                    <figcaption className="mt-4 text-[12px] text-ink-500">
                      — {review.author_name}
                    </figcaption>
                  </figure>
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold tracking-tight">You might also like</h2>
            <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <RevealItem key={item.id}>
                  <ProductCard product={item} />
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        )}
      </div>
    </div>
  );
}
