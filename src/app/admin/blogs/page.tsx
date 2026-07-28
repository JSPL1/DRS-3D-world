import { Eye } from 'lucide-react';
import Link from 'next/link';

import { Card, EmptyState, PageHeader, shortDate, StatusPill, Table, Td, Th } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Blog' };

export default async function AdminBlogsPage() {
  await requirePermission('blogs.edit');

  const posts = all<{
    id: number;
    title: string;
    slug: string;
    category: string | null;
    status: string;
    reading_minutes: number;
    view_count: number;
    published_at: string | null;
    author_name: string | null;
  }>(
    `SELECT b.id, b.title, b.slug, b.category, b.status, b.reading_minutes,
            b.view_count, b.published_at, u.name AS author_name
     FROM blogs b LEFT JOIN users u ON u.id = b.author_id
     ORDER BY b.published_at DESC`,
  );

  return (
    <>
      <PageHeader title="Blog" subtitle={`${posts.length} articles`} />

      <Card>
        {posts.length === 0 ? (
          <EmptyState title="No articles yet" body="Published articles will appear here and on the blog." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Status</Th>
                <Th className="text-right">Read time</Th>
                <Th className="text-right">Views</Th>
                <Th className="text-right">Published</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-white/[0.02]">
                  <Td className="max-w-sm">
                    <span className="block truncate font-medium text-white">{post.title}</span>
                    <span className="block font-mono text-[11px] text-ink-500">/{post.slug}</span>
                  </Td>
                  <Td className="text-[13px] text-ink-400">{post.category ?? '—'}</Td>
                  <Td className="text-[13px] text-ink-400">{post.author_name ?? '—'}</Td>
                  <Td><StatusPill status={post.status} /></Td>
                  <Td className="text-right tabular-nums text-ink-300">{post.reading_minutes} min</Td>
                  <Td className="text-right font-mono tabular-nums text-ink-400">
                    {post.view_count.toLocaleString('en-IN')}
                  </Td>
                  <Td className="text-right text-[12.5px] text-ink-500">
                    {post.published_at ? shortDate(post.published_at) : '—'}
                  </Td>
                  <Td>
                    <div className="flex justify-end">
                      <Link
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        aria-label={`View ${post.title}`}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
