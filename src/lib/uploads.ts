import 'server-only';

import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { one, run } from '@/lib/db';

/**
 * Where uploaded files live, and why it isn't `public/`.
 *
 * `next start` takes its list of public assets when the server boots. A file
 * written into `public/` afterwards is on disk, world-readable, at the right
 * path — and returns 404 until the process is restarted. Uploads are by
 * definition written after boot, so `public/` can never serve them. (Measured:
 * a file present at start served 200; the identical file copied in a minute
 * later served 404.)
 *
 * They also must not live inside the app directory at all, because a deploy
 * replaces it. So they sit beside the SQLite database, in the data directory
 * that already persists across deploys, and are served by a route handler at
 * /uploads/[...path].
 */

export function uploadsDir(): string {
  const base = process.env.DATA_DIR
    ? resolve(process.env.DATA_DIR)
    : resolve(process.cwd(), 'data');

  const dir = join(base, 'uploads');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Files uploaded before this changed are still sitting in `public/uploads`,
 * and are still referenced by rows in the database. They are served from
 * there, so nothing that already worked stops working.
 */
export function legacyUploadsDir(): string {
  return resolve(process.cwd(), 'public', 'uploads');
}

/**
 * Turns a request path into a real file, or null.
 *
 * The containment check is the point: a name like `../../drs.sqlite` resolves
 * cleanly with `join`, and without this would hand out the database.
 */
export function resolveUploadFile(segments: string[]): string | null {
  if (segments.length === 0) return null;

  // One flat directory — uploaded names are generated, never nested.
  if (segments.length > 1) return null;

  const name = segments[0];
  if (!name || name.includes('\0')) return null;

  for (const dir of [uploadsDir(), legacyUploadsDir()]) {
    const candidate = resolve(dir, name);
    if (!candidate.startsWith(dir + sep)) continue;
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

/**
 * Stores the bytes of an upload, so it survives a deploy.
 *
 * The disk copy is still written — it is what serves the file locally, and it
 * costs nothing — but the database copy is the one that is still there after
 * the host wipes the application directory.
 */
export async function storeUpload(name: string, mimeType: string, bytes: Buffer) {
  await run(
    `INSERT INTO upload_files (name, mime_type, size_bytes, bytes)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type),
                             size_bytes = VALUES(size_bytes),
                             bytes = VALUES(bytes)`,
    [name, mimeType, bytes.length, bytes],
  );
}

/** The stored bytes for an uploaded name, or null if we never had it. */
export async function readStoredUpload(
  name: string,
): Promise<{ mimeType: string; bytes: Buffer } | null> {
  const row = await one<{ mime_type: string; bytes: Buffer }>(
    `SELECT mime_type, bytes FROM upload_files WHERE name = ?`,
    [name],
  );
  if (!row) return null;
  return { mimeType: row.mime_type, bytes: row.bytes };
}

/** Extensions the upload endpoint accepts, mapped back to their media type. */
export const UPLOAD_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
};
