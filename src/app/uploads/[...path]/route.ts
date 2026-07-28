import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { NextResponse } from 'next/server';

import { resolveUploadFile, UPLOAD_CONTENT_TYPES } from '@/lib/uploads';

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

  const file = resolveUploadFile(path);
  if (!file) {
    return new NextResponse('Not found', { status: 404 });
  }

  const type = UPLOAD_CONTENT_TYPES[extname(file).slice(1).toLowerCase()];
  if (!type) {
    // Only the types the upload endpoint accepts are served back. Anything
    // else on disk is not ours to hand out.
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const [body, info] = await Promise.all([readFile(file), stat(file)]);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // An uploaded SVG renders as a document if opened directly; the
        // sandbox stops it doing anything if one ever slips past validation.
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
