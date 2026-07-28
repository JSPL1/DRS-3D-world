import type { MetadataRoute } from 'next';

import { getAllProductSlugs, getBlogPosts } from '@/lib/queries';
import { site } from '@/lib/site';

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/quote`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/industries`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/videos`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const products: MetadataRoute.Sitemap = getAllProductSlugs().map((product) => ({
    url: `${base}/products/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at.replace(' ', 'T') + 'Z') : now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const posts: MetadataRoute.Sitemap = getBlogPosts(200).map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: post.published_at ? new Date(post.published_at.replace(' ', 'T') + 'Z') : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...products, ...posts];
}
