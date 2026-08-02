import { Clock, Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { RevealGroup, RevealItem, SectionHeading } from '@/components/ui/Reveal';
import { getBlogPosts } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides, case studies and materials notes from the DRS 3D WORLD studio.',
};

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await getBlogPosts(24);
  const [lead, ...rest] = posts;

  return (
    <div className="pb-24 pt-36">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="left"
          eyebrow="Journal"
          title={
            <>
              What we have <span className="text-flame">learned</span>.
            </>
          }
          lead="Guides written for people who have to make a decision, not for search engines."
        />

        {lead && (
          <Link
            href={`/blog/${lead.slug}`}
            className="group glass mt-14 grid overflow-hidden rounded-2xl transition-all duration-500 hover:border-flame-500/30 lg:grid-cols-2"
          >
            <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-[340px]">
              {lead.cover_url && (
                <Image
                  src={lead.cover_url}
                  alt={lead.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                />
              )}
            </div>

            <div className="flex flex-col justify-center p-8 lg:p-11">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.16em]">
                <span className="text-flame-500">{lead.category}</span>
                <span className="text-ink-500">·</span>
                <span className="text-ink-500">Latest</span>
              </div>

              <h2 className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight transition-colors group-hover:text-flame-400 lg:text-4xl">
                {lead.title}
              </h2>

              <p className="mt-4 text-[15px] leading-relaxed text-ink-300">{lead.excerpt}</p>

              <div className="mt-6 flex items-center gap-5 text-[12.5px] text-ink-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {lead.reading_minutes} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  {lead.view_count.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Link>
        )}

        <RevealGroup className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <RevealItem key={post.id}>
              <Link
                href={`/blog/${post.slug}`}
                className="group glass flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/30"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
                  {post.cover_url && (
                    <Image
                      src={post.cover_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                    />
                  )}
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-flame-500">
                    {post.category}
                  </span>
                  <h3 className="mt-2.5 font-display text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-flame-400">
                    {post.title}
                  </h3>
                  <p className="mt-2.5 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-ink-400">
                    {post.excerpt}
                  </p>
                  <span className="mt-5 flex items-center gap-1.5 border-t border-white/5 pt-4 text-[12px] text-ink-500">
                    <Clock className="h-3.5 w-3.5" />
                    {post.reading_minutes} min read
                  </span>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
