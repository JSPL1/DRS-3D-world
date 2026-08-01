import { BlogEditor } from '@/components/admin/BlogEditor';
import { PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Blog' };

export default async function AdminBlogsPage() {
  await requirePermission('blogs.edit');

  const posts = all<{
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    cover_url: string | null;
    category: string | null;
    status: string;
    reading_minutes: number;
    view_count: number;
    published_at: string | null;
    author_name: string | null;
  }>(
    `SELECT b.id, b.title, b.slug, b.excerpt, b.content, b.cover_url, b.category, b.status,
            b.reading_minutes, b.view_count, b.published_at, u.name AS author_name
     FROM blogs b LEFT JOIN users u ON u.id = b.author_id
     ORDER BY b.published_at DESC, b.created_at DESC`,
  );

  return (
    <>
      <PageHeader title="Blog" subtitle={`${posts.length} articles`} />
      <BlogEditor posts={posts} />
    </>
  );
}
