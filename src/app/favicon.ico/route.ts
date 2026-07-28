import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { NextResponse } from 'next/server';

import { getBranding } from '@/lib/branding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Browsers request /favicon.ico directly, ignoring the <link rel="icon">
 * tags, and cache the result hard. Without this route that request 404s and
 * the browser keeps showing whatever it cached previously — which is why an
 * uploaded favicon appears in the admin but never in the tab.
 *
 * Serving the configured icon here means the hardcoded request resolves to
 * the right image regardless of what the link tags say.
 */
export async function GET() {
  const branding = getBranding();
  const icon = branding.faviconUrl;

  // Only ever read from inside public/ — the value comes from the database
  // and must not be able to walk out of that directory.
  if (icon.startsWith('/')) {
    const publicDir = join(process.cwd(), 'public');
    const target = normalize(join(publicDir, icon));

    if (target.startsWith(publicDir)) {
      try {
        const data = await readFile(target);
        const ext = target.split('.').pop()?.toLowerCase();
        const type =
          ext === 'svg' ? 'image/svg+xml'
          : ext === 'png' ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'webp' ? 'image/webp'
          : 'image/x-icon';

        return new NextResponse(new Uint8Array(data), {
          headers: {
            'Content-Type': type,
            // Short cache: the admin can change this at any time, and a long
            // TTL here is exactly what makes a new favicon fail to appear.
            'Cache-Control': 'public, max-age=60, must-revalidate',
          },
        });
      } catch {
        // Fall through to the redirect below.
      }
    }
  }

  return NextResponse.redirect(new URL(icon, process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
}
