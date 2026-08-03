import { ArrowLeft, Clock, Eye } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getBlogPostBySlug, getBlogPosts } from '@/lib/queries';
import { parseJson } from '@/lib/db';
import { site } from '@/lib/site';

// Not ISR-cached: the shell reads the admin-controlled theme and logo, so a
// stale prerender keeps serving the previous branding. The proxy attaches
// stale-while-revalidate of ~1 year to ISR responses, which made a theme
// change effectively never reach visitors.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Article not found' };

  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt ?? '',
      publishedTime: post.published_at ?? undefined,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
  };
}

/**
 * Minimal markdown rendering for the seeded articles: headings, paragraphs and
 * bold. Deliberately not a full parser — the admin editor stores this same
 * subset, and running arbitrary HTML from the database would be a liability.
 */
function renderBody(content: string) {
  return content.split('\n\n').map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="mt-12 font-display text-2xl font-bold tracking-tight text-white">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={i} className="mt-12 font-display text-3xl font-bold tracking-tight text-white">
          {trimmed.slice(2)}
        </h2>
      );
    }

    return (
      <p key={i} className="mt-5 text-[16px] leading-[1.8] text-ink-200">
        {trimmed}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const tags = parseJson<string[]>(post.tags, []);
  const more = (await getBlogPosts(4)).filter((p) => p.slug !== post.slug).slice(0, 3);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    author: { '@type': 'Organization', name: post.author_name ?? site.name },
    publisher: { '@type': 'Organization', name: site.name },
  };

  return (
    <article className="pb-24 pt-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[13px] text-ink-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All articles
        </Link>

        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-flame-500">{post.category}</p>

        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-5 text-lg leading-relaxed text-ink-300">{post.excerpt}</p>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-5 border-y border-white/5 py-4 text-[12.5px] text-ink-500">
          {post.author_name && <span>By {post.author_name}</span>}
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </time>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.reading_minutes} min read
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {post.view_count.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {post.cover_url && (
        <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
          <div className="relative aspect-[16/8] overflow-hidden rounded-2xl bg-ink-900">
            <Image
              src={post.cover_url}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover"
            />
          </div>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6">
        {post.content && renderBody(post.content)}

        {tags.length > 0 && (
          <div className="mt-14 flex flex-wrap gap-2 border-t border-white/5 pt-8">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-ink-300"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {more.length > 0 && (
        <div className="mx-auto mt-20 max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">Keep reading</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {more.map((item) => (
              <Link
                key={item.id}
                href={`/blog/${item.slug}`}
                className="group glass rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-flame-500/30"
              >
                <span className="text-[11px] uppercase tracking-[0.16em] text-flame-500">
                  {item.category}
                </span>
                <h3 className="mt-2.5 font-display text-[17px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-flame-400">
                  {item.title}
                </h3>
                <p className="mt-2.5 line-clamp-2 text-[13px] text-ink-400">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
