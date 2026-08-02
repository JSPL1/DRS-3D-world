import { NextResponse } from 'next/server';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { all, getPool } from '@/lib/db';

export const runtime = 'nodejs';

function escapeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Downloads a plain-SQL snapshot of every table — a MySQL database has no
 * single file to copy the way the old SQLite one did, so this walks each
 * table and writes it back out as INSERT statements, in the same format
 * GoDaddy's own "Import SQL" button on the Hosted Database screen accepts.
 */
export async function GET() {
  const { user, deny } = await guard('backup.manage');
  if (deny) return deny;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  try {
    const tableRows = await all<{ TABLE_NAME: string }>(
      `SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME`,
    );

    const pool = getPool();
    const lines: string[] = [
      `-- DRS 3D WORLD backup — ${stamp}`,
      'SET FOREIGN_KEY_CHECKS = 0;',
      '',
    ];
    let totalRows = 0;

    for (const { TABLE_NAME: table } of tableRows) {
      const [rows] = await pool.query<import('mysql2').RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      lines.push(`-- ${table} (${rows.length} rows)`);
      for (const row of rows) {
        const values = columns.map((c) => escapeValue(row[c]));
        lines.push(
          `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${values.join(', ')});`,
        );
      }
      lines.push('');
      totalRows += rows.length;
    }

    lines.push('SET FOREIGN_KEY_CHECKS = 1;');
    const sql = lines.join('\n');

    await logActivity(user.id, user.name, 'downloaded backup', 'settings', undefined, `${totalRows} rows`);

    return new NextResponse(sql, {
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="drs-backup-${stamp}.sql"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[drs] backup failed', error);
    return NextResponse.json({ error: 'Backup failed. Check the server logs.' }, { status: 500 });
  }
}
