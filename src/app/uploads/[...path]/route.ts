import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { NextResponse } from 'next/server';

import { readStoredUpload, resolveUploadFile, UPLOAD_CONTENT_TYPES } from '@/lib/uploads';

/** Same headers whether the bytes came from disk or from the database. */
function imageHeaders(type: string, length: number) {
  return {
    'Content-Type': type,
    'Content-Length': String(length),
    'Cache-Control': 'public, max-age=31536000, immutable',
    // An uploaded SVG renders as a document if opened directly; the sandbox
    // stops it doing anything if one ever slips past validation.
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Serves uploaded images.
 *
 * Next's static handler only knows about files that existed when the server
 * booted, which is never true of an upload — see lib/uploads.ts. This reads
 * from disk per request instead, so a photo is visible the moment it is
 * uploaded rather than after the next restart.
 *
 * Uploaded names carry a timestamp and random suffix and are never reused, so
 * the response is safe to cache immutably: replacing a product photo produces
 * a new URL rather than a stale cached one.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // Disk first: the images shipped with the code live there, and reading a
  // local file beats a database round trip.
  const file = resolveUploadFile(path);
  if (file) {
    const type = UPLOAD_CONTENT_TYPES[extname(file).slice(1).toLowerCase()];
    if (type) {
      try {
        const [body, info] = await Promise.all([readFile(file), stat(file)]);
        return new NextResponse(new Uint8Array(body), {
          headers: imageHeaders(type, info.size),
        });
      } catch {
        // Fall through to the stored copy.
      }
    }
  }

  // Then the database. This is what answers after a deploy has wiped the
  // application directory and taken the uploaded file with it.
  if (path.length === 1 && path[0] && !path[0].includes('\0')) {
    const stored = await readStoredUpload(path[0]);
    if (stored) {
      const type =
        UPLOAD_CONTENT_TYPES[extname(path[0]).slice(1).toLowerCase()] ?? stored.mimeType;
      return new NextResponse(new Uint8Array(stored.bytes), {
        headers: imageHeaders(type, stored.bytes.length),
      });
    }
  }

  return new NextResponse('Not found', { status: 404 });
}
