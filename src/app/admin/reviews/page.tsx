import { PageHeader } from '@/components/admin/Shell';
import { ReviewEditor } from '@/components/admin/ReviewEditor';
import { listAdminReviews } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Reviews' };

export default async function AdminReviewsPage() {
  await requirePermission('reviews.moderate');
  const reviews = await listAdminReviews();
  const products = await all<{ id: number; name: string }>(
    `SELECT id, name FROM products ORDER BY name`,
  );

  return (
    <>
      <PageHeader title="Reviews" subtitle={`${reviews.length} customer reviews`} />
      <ReviewEditor reviews={reviews} products={products} />
    </>
  );
}
