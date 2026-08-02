import { Card, PageHeader, relativeTime, Table, Td, Th } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { all } from '@/lib/db';

export const metadata = { title: 'Activity log' };

export default async function AdminActivityPage() {
  await requirePermission('activity.view');

  const entries = await all<{
    id: number;
    actor_name: string | null;
    action: string;
    entity_type: string | null;
    entity_id: number | null;
    detail: string | null;
    ip_address: string | null;
    created_at: string;
  }>(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200`);

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Every change made through the admin panel, most recent first."
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Who</Th>
              <Th>Did what</Th>
              <Th>Detail</Th>
              <Th className="text-right">When</Th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-white/[0.02]">
                <Td className="font-medium text-white">{entry.actor_name ?? 'System'}</Td>
                <Td className="text-ink-200">
                  {entry.action}
                  {entry.entity_type && (
                    <span className="ml-2 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-ink-400">
                      {entry.entity_type}
                      {entry.entity_id ? `#${entry.entity_id}` : ''}
                    </span>
                  )}
                </Td>
                <Td className="max-w-md truncate text-[12.5px] text-ink-500">{entry.detail ?? '—'}</Td>
                <Td className="text-right text-[12.5px] text-ink-500">
                  {relativeTime(entry.created_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
