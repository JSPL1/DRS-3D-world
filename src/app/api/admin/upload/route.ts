import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { guard } from '@/lib/auth/api-guard';
import { can, type Permission } from '@/lib/auth/roles';
import { logActivity } from '@/lib/auth/session';
import { run } from '@/lib/db';
import { storeUpload, uploadsDir } from '@/lib/uploads';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Only image types the browser can render inline, matched on both the declared
 * MIME type and the file's magic bytes. Trusting `file.type` alone would let a
 * renamed executable land in a publicly-served directory.
 */
const ALLOWED: Record<string, { ext: string; magic: number[][] }> = {
  'image/png': { ext: 'png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/jpeg': { ext: 'jpg', magic: [[0xff, 0xd8, 0xff]] },
  'image/webp': { ext: 'webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  'image/svg+xml': { ext: 'svg', magic: [] },
  'image/x-icon': { ext: 'ico', magic: [[0x00, 0x00, 0x01, 0x00]] },
};

function matchesMagic(bytes: Uint8Array, signatures: number[][]) {
  if (signatures.length === 0) return true; // SVG is text; validated separately
  return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte));
}

/**
 * What a file is for decides who may send it.
 *
 * Replacing the site's logo is a branding decision and stays with whoever can
 * change settings. Adding a photograph to a product is part of entering the
 * product, so it belongs to the same permission as the product itself —
 * otherwise a member of the sales team can create a product but not
 * illustrate it, and ends up mailing photographs to an administrator.
 */
const PURPOSE_PERMISSION: Record<string, Permission> = {
  product: 'products.edit',
  'product-colour': 'products.edit',
  gallery: 'gallery.edit',
  testimonial: 'testimonials.edit',
  banner: 'banners.edit',
  video: 'videos.edit',
  blog: 'blogs.edit',
};

export async function POST(req: Request) {
  // The body has to be read before the purpose is known, so authorise against
  // the strictest permission first and re-check once the purpose is in hand.
  const { user, deny } = await guard('products.view');
  if (deny) return deny;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected a file upload.' }, { status: 400 });
  }

  const file = form.get('file');
  const purpose = String(form.get('purpose') ?? 'media');

  // Anything not in the table is branding or general media: settings.edit.
  const required = PURPOSE_PERMISSION[purpose] ?? 'settings.edit';
  if (!can(user.role, required)) {
    return NextResponse.json({ error: 'Your role does not allow this action.' }, { status: 403 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was received.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.` },
      { status: 413 },
    );
  }

  const spec = ALLOWED[file.type];
  if (!spec) {
    return NextResponse.json(
      { error: 'Use a PNG, JPG, WEBP, SVG or ICO image.' },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesMagic(new Uint8Array(buffer.subarray(0, 8)), spec.magic)) {
    return NextResponse.json(
      { error: "That file's contents don't match its type." },
      { status: 415 },
    );
  }

  // An SVG is executable in a browser context. Reject anything carrying script
  // or event handlers rather than serving it from our own origin.
  if (file.type === 'image/svg+xml') {
    const text = buffer.toString('utf8');
    if (/<script|on\w+\s*=|javascript:|<foreignObject/i.test(text)) {
      return NextResponse.json(
        { error: 'That SVG contains scripting and cannot be used. Export a flat SVG, or use a PNG.' },
        { status: 415 },
      );
    }
  }

  // Random name: never trust the client's filename for a path.
  const name = `${purpose}-${Date.now()}-${randomBytes(4).toString('hex')}.${spec.ext}`;

  // Two copies, deliberately. The disk copy serves the file locally and costs
  // nothing; the database copy is the one that is still there after the host
  // wipes the application directory on the next deploy.
  await writeFile(join(uploadsDir(), name), buffer, { mode: 0o644 });
  await storeUpload(name, file.type, buffer);

  const url = `/uploads/${name}`;

  await run(
    `INSERT INTO media (file_name, url, mime_type, size_bytes, folder, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [file.name.slice(0, 200), url, file.type, buffer.length, purpose, user.id],
  );

  // A logo or favicon upload immediately becomes the site's branding.
  const BRANDING_KEYS: Record<string, string> = {
    logo: 'site_logo_url',
    'logo-light': 'site_logo_light_url',
    favicon: 'site_favicon_url',
  };
  const key = BRANDING_KEYS[purpose];
  if (key) {
    await run(
      `INSERT INTO settings (\`key\`, value, \`group\`, updated_at)
       VALUES (?, ?, 'appearance', NOW())
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [key, url],
    );

    revalidatePath('/', 'layout');
  }

  await logActivity(user.id, user.name, `uploaded ${purpose}`, 'media', undefined, url);

  return NextResponse.json({ ok: true, url, name });
}
