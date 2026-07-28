import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'FAQ' };

export default async function AdminFaqPage() {
  await requirePermission('faq.edit');

  const faqs = all<{
    id: number;
    question: string;
    answer: string;
    category: string | null;
    is_active: number;
  }>(`SELECT * FROM faqs ORDER BY category, sort_order`);

  return (
    <>
      <PageHeader
        title="Frequently asked questions"
        subtitle="These also feed the FAQ structured data Google reads."
      />

      {faqs.length === 0 ? (
        <Card>
          <EmptyState title="No questions yet" body="Add questions to show them on the FAQ page." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((faq) => (
            <article key={faq.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {faq.category && (
                    <span className="text-[11px] uppercase tracking-[0.16em] text-flame-500">
                      {faq.category}
                    </span>
                  )}
                  <h2 className="mt-1 font-display text-[15px] font-semibold text-white">
                    {faq.question}
                  </h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">{faq.answer}</p>
                </div>

                <ToggleSwitch
                  entity="faq"
                  id={faq.id}
                  value={faq.is_active === 1}
                  label={`Show: ${faq.question}`}
                  onLabel="Visible"
                  offLabel="Hidden"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
