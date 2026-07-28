import Link from 'next/link';

import { ToggleSwitch } from '@/components/admin/StatusSelect';
import { Card, EmptyState, PageHeader, relativeTime } from '@/components/admin/Shell';
import { getNotifications } from '@/lib/admin-queries';
import { requirePermission } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

export const metadata = { title: 'Notifications' };

const TYPE_STYLES: Record<string, string> = {
  order: 'bg-sky-500/12 text-sky-400',
  lead: 'bg-violet-500/12 text-violet-400',
  quote: 'bg-flame-500/15 text-flame-400',
  success: 'bg-emerald-500/12 text-emerald-400',
  warning: 'bg-amber-500/12 text-amber-400',
  error: 'bg-red-500/12 text-red-400',
  info: 'bg-ink-500/20 text-ink-300',
};

export default async function AdminNotificationsPage() {
  await requirePermission('notifications.view');
  const notifications = getNotifications(60);

  const unread = notifications.filter((n) => n.is_read === 0).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up.'}
      />

      {notifications.length === 0 ? (
        <Card>
          <EmptyState title="Nothing here" body="New orders, leads and quotes will notify you here." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-white/[0.04]">
            {notifications.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-start gap-4 px-6 py-4 transition-colors',
                  item.is_read === 0 && 'bg-flame-500/[0.04]',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 shrink-0 rounded-md px-2 py-1 text-[10.5px] font-medium capitalize',
                    TYPE_STYLES[item.type] ?? TYPE_STYLES.info,
                  )}
                >
                  {item.type}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-white">
                    {item.href ? (
                      <Link href={item.href} className="transition-colors hover:text-flame-400">
                        {item.title}
                      </Link>
                    ) : (
                      item.title
                    )}
                  </p>
                  {item.body && <p className="mt-0.5 text-[12.5px] text-ink-400">{item.body}</p>}
                  <p className="mt-1 text-[11px] text-ink-500">{relativeTime(item.created_at)}</p>
                </div>

                <ToggleSwitch
                  entity="notification"
                  id={item.id}
                  value={item.is_read === 1}
                  label={`Mark "${item.title}" as read`}
                  onLabel="Read"
                  offLabel="Unread"
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
