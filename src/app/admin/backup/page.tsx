import { AlertTriangle, Download } from 'lucide-react';

import { Card, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { count } from '@/lib/db';

export const metadata = { title: 'Backup' };

export default async function AdminBackupPage() {
  await requirePermission('backup.manage');

  const tables: Array<[string, number]> = [
    ['Products', await count(`SELECT COUNT(*) AS c FROM products`)],
    ['Orders', await count(`SELECT COUNT(*) AS c FROM orders`)],
    ['Quotes', await count(`SELECT COUNT(*) AS c FROM quotes`)],
    ['Leads', await count(`SELECT COUNT(*) AS c FROM leads`)],
    ['Users', await count(`SELECT COUNT(*) AS c FROM users`)],
    ['Blog posts', await count(`SELECT COUNT(*) AS c FROM blogs`)],
    ['Gallery items', await count(`SELECT COUNT(*) AS c FROM gallery_items`)],
    ['Activity entries', await count(`SELECT COUNT(*) AS c FROM activity_logs`)],
  ];

  return (
    <>
      <PageHeader title="Backup" subtitle="Download a complete copy of the database as plain SQL." />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card title="Download">
          <div className="p-6">
            <p className="text-[14px] leading-relaxed text-ink-300">
              This produces a <code className="font-mono text-[12.5px]">.sql</code> file listing every
              row in every table, safe to take while the site is serving traffic. It is the same
              format GoDaddy&apos;s own &ldquo;Import SQL&rdquo; button on the Hosted Database screen
              accepts, so it doubles as a way to move data between environments.
            </p>

            <a
              href="/api/admin/backup"
              download
              className="mt-6 inline-flex h-12 items-center gap-2.5 rounded-xl bg-flame-700 px-6 text-sm font-medium text-white transition-colors hover:bg-flame-800"
            >
              <Download className="h-4 w-4" />
              Download database snapshot
            </a>

            <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                Restoring
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-amber-200">
                Restore is a deliberate, offline operation: on GoDaddy, open the app&apos;s Hosted
                Database screen and use &ldquo;Import SQL&rdquo; with this file. There is deliberately
                no one-click restore here — overwriting a live database from a web request is not
                something that should be one click away.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Contents">
          <ul className="divide-y divide-white/[0.04]">
            {tables.map(([label, n]) => (
              <li key={label} className="flex items-center justify-between px-6 py-2.5 text-[13px]">
                <span className="text-ink-300">{label}</span>
                <span className="font-mono tabular-nums text-white">{n.toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
