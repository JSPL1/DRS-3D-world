import { Star } from 'lucide-react';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader, relativeTime } from '@/components/admin/Shell';
import { listAdminReviews } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';

export const metadata = { title: 'Reviews' };

export default async function AdminReviewsPage() {
  await requirePermission('reviews.moderate');
  const reviews = listAdminReviews();

  const pending = reviews.filter((r) => r.is_approved === 0).length;

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle={
          pending > 0
            ? `${pending} awaiting approval — only approved reviews appear on the website.`
            : 'Everything is approved. Only approved reviews appear on the website.'
        }
      />

      {reviews.length === 0 ? (
        <Card>
          <EmptyState title="No reviews yet" body="Customer reviews will appear here for approval." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reviews.map((review) => (
            <article
              key={review.id}
              className={`glass rounded-2xl p-5 ${review.is_approved === 0 ? 'border-flame-500/25' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }, (_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-flame-500 text-flame-500" />
                    ))}
                  </div>
                  {review.title && (
                    <h2 className="mt-2 font-display text-[15px] font-semibold text-white">
                      {review.title}
                    </h2>
                  )}
                </div>

                <ToggleSwitch
                  entity="review"
                  id={review.id}
                  value={review.is_approved === 1}
                  label={`Approve review by ${review.author_name}`}
                  onLabel="Live"
                  offLabel="Hidden"
                />
              </div>

              {review.body && (
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-300">{review.body}</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3.5 text-[12px]">
                <span className="text-ink-400">
                  {review.author_name}
                  {review.product_name && (
                    <span className="text-ink-500"> · {review.product_name}</span>
                  )}
                </span>
                <span className="text-ink-500">{relativeTime(review.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
