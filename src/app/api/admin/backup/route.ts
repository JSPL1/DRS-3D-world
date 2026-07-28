import { NextResponse } from 'next/server';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { guard } from '@/lib/auth/api-guard';
import { logActivity } from '@/lib/auth/session';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Downloads a consistent snapshot of the database.
 *
 * Uses SQLite's own backup API rather than copying the file: with WAL enabled a
 * plain file copy can capture a torn state mid-write.
 */
export async function GET() {
  const { user, deny } = await guard('backup.manage');
  if (deny) return deny;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tempPath = join(tmpdir(), `drs-backup-${stamp}.sqlite`);

  try {
    await getDb().backup(tempPath);
    const buffer = await readFile(tempPath);

    logActivity(user.id, user.name, 'downloaded backup', 'settings', undefined, `${buffer.length} bytes`);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.sqlite3',
        'Content-Disposition': `attachment; filename="drs-backup-${stamp}.sqlite"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[drs] backup failed', error);
    return NextResponse.json({ error: 'Backup failed. Check the server logs.' }, { status: 500 });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
