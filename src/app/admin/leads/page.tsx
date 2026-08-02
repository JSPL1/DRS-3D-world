import { Mail, Phone } from 'lucide-react';
import Link from 'next/link';

import { StatusSelect } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader, relativeTime } from '@/components/admin/Shell';
import { listAdminLeads } from '@/lib/admin-queries';
import { can } from '@/lib/auth/roles';
import { requirePermission } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Leads' };

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission('leads.view');
  const { status } = await searchParams;

  const validStatus = LEAD_STATUSES.includes(status as never) ? status : undefined;
  const leads = await listAdminLeads(validStatus);
  const editable = can(user.role, 'leads.edit');

  return (
    <>
      <PageHeader title="Leads" subtitle={`${leads.length} enquiry${leads.length === 1 ? '' : 'ies'} from the website`} />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/admin/leads"
          className={cn(
            'rounded-lg px-3.5 py-2 text-[12.5px] font-medium capitalize transition-colors',
            !validStatus ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-white',
          )}
        >
          All
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/leads?status=${s}`}
            className={cn(
              'rounded-lg px-3.5 py-2 text-[12.5px] font-medium capitalize transition-colors',
              validStatus === s ? 'bg-flame-500/15 text-flame-400' : 'text-ink-400 hover:text-white',
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <Card>
          <EmptyState title="No leads here" body="Enquiries from the contact form will land here." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {leads.map((lead) => (
            <article key={lead.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[15px] font-semibold text-white">
                    {lead.name}
                  </h2>
                  {lead.company && <p className="text-[12.5px] text-ink-400">{lead.company}</p>}
                </div>

                {editable ? (
                  <StatusSelect entity="lead" id={lead.id} value={lead.status} options={LEAD_STATUSES} />
                ) : (
                  <span className="text-[12px] capitalize text-ink-300">{lead.status}</span>
                )}
              </div>

              {lead.subject && (
                <p className="mt-3 text-[13px] font-medium text-flame-400">{lead.subject}</p>
              )}
              {lead.message && (
                <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-ink-300">
                  {lead.message}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3.5 text-[12.5px]">
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 text-ink-300 transition-colors hover:text-flame-400"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {lead.email}
                  </a>
                )}
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 text-ink-300 transition-colors hover:text-flame-400"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {lead.phone}
                  </a>
                )}
                <span className="ml-auto text-ink-500">{relativeTime(lead.created_at)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
