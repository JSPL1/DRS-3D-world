import { AlertTriangle, Download, HardDrive } from 'lucide-react';
import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Card, PageHeader } from '@/components/admin/Shell';
import { requirePermission } from '@/lib/auth/session';
import { count } from '@/lib/db';

export const metadata = { title: 'Backup' };

function databasePath() {
  if (process.env.DATABASE_PATH) return resolve(process.env.DATABASE_PATH);
  const dir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : resolve(process.cwd(), 'data');
  return join(dir, 'drs.sqlite');
}

export default async function AdminBackupPage() {
  await requirePermission('backup.manage');

  const path = databasePath();

  let sizeBytes = 0;
  let modified: Date | null = null;
  try {
    const stats = statSync(path);
    sizeBytes = stats.size;
    modified = stats.mtime;
  } catch {
    // Nothing written yet — the counts below still render.
  }

  const tables: Array<[string, number]> = [
    ['Products', count(`SELECT COUNT(*) AS c FROM products`)],
    ['Orders', count(`SELECT COUNT(*) AS c FROM orders`)],
    ['Quotes', count(`SELECT COUNT(*) AS c FROM quotes`)],
    ['Leads', count(`SELECT COUNT(*) AS c FROM leads`)],
    ['Users', count(`SELECT COUNT(*) AS c FROM users`)],
    ['Blog posts', count(`SELECT COUNT(*) AS c FROM blogs`)],
    ['Gallery items', count(`SELECT COUNT(*) AS c FROM gallery_items`)],
    ['Activity entries', count(`SELECT COUNT(*) AS c FROM activity_logs`)],
  ];

  return (
    <>
      <PageHeader title="Backup" subtitle="Download a complete, consistent copy of the database." />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card title="Download">
          <div className="p-6">
            <p className="text-[14px] leading-relaxed text-ink-300">
              This produces a snapshot using SQLite’s own backup mechanism, so it is safe to take
              while the site is serving traffic — unlike copying the file directly, which can catch
              a half-written transaction.
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
                Restore is a deliberate, offline operation: stop the service, replace the file at{' '}
                <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">{path}</code>{' '}
                with your snapshot, remove any <code className="font-mono text-[11px]">-wal</code> and{' '}
                <code className="font-mono text-[11px]">-shm</code> siblings, then start it again.
                There is deliberately no one-click restore here — overwriting a live database from a
                web request is not something that should be one click away.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Database file">
            <div className="p-6">
              <p className="flex items-center gap-2 text-[13px] text-ink-300">
                <HardDrive className="h-4 w-4 text-flame-500" />
                {sizeBytes > 0 ? `${(sizeBytes / 1024 / 1024).toFixed(2)} MB` : 'Not yet written'}
              </p>
              <p className="mt-2 break-all font-mono text-[11px] text-ink-500">{path}</p>
              {modified && (
                <p className="mt-3 text-[12px] text-ink-500">
                  Last modified {modified.toLocaleString('en-IN')}
                </p>
              )}
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
      </div>
    </>
  );
}
