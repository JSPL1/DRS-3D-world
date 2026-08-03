import 'server-only';

import { cache } from 'react';

import { DEFAULT_CURSOR, isCursorVariant, type CursorVariant } from '@/lib/cursor';
import { getSettings } from '@/lib/queries';
import { readStoredUpload, resolveUploadFile } from '@/lib/uploads';

/** The lockup that ships with the code, so there is always something to draw. */
const BUNDLED_LOGO = '/brand/logo.png';

/**
 * An uploaded image nothing can serve resolves to the bundled logo.
 *
 * Checked against both places an upload can be: the disk, and the database.
 * A settings row can outlive the file it names — the host wipes the
 * application directory on every deploy — and the result was a broken image
 * where the studio's logo should be.
 */
async function usableImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith('/uploads/')) return url;

  const name = url.slice('/uploads/'.length);
  if (resolveUploadFile([name])) return url;
  return (await readStoredUpload(name)) ? url : null;
}

/**
 * Site-wide appearance, controlled by the administrator.
 *
 * Deliberately server-resolved: the theme is a property of the site, not of
 * the visitor, so it must be in the first HTML response. Reading it on the
 * client would produce a flash of the wrong theme on every page load.
 */

export type Theme = 'dark' | 'light';

export type Branding = {
  theme: Theme;
  logoUrl: string | null;
  /** Optional second lockup for the light theme; falls back to `logoUrl`. */
  logoLightUrl: string | null;
  cursor: CursorVariant;
  /** The lockup to render for the theme currently in force. */
  headerLogoUrl: string | null;
  /** True when the only lockup available was drawn for a dark background. */
  logoNeedsDarkChip: boolean;
  faviconUrl: string;
  /** Same icon with a version marker, for the <link> tags. */
  faviconHref: string;
  siteName: string;
};

/**
 * Memoized per request: the root layout alone calls this three times
 * (metadata, viewport, the shell itself), and every nested layout/page that
 * needs the theme or logo calls it again. Without `cache()` a single page
 * view was re-reading and re-computing this up to five times — real, free
 * work to cut on a CPU-throttled host, and safe because the memoization
 * never survives past the one request it was computed for.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  const settings = await getSettings();

  const theme: Theme = settings.site_theme === 'light' ? 'light' : 'dark';

  // Anything nothing can serve is treated as absent, so the bundled lockup
  // stands in rather than a broken image.
  const storedLogo = await usableImage(settings.site_logo_url?.trim() || null);
  const logoUrl = storedLogo ?? BUNDLED_LOGO;
  const logoLightUrl = await usableImage(settings.site_logo_light_url?.trim() || null);

  const cursorSetting = settings.site_cursor?.trim();
  const cursor: CursorVariant = isCursorVariant(cursorSetting) ? cursorSetting : DEFAULT_CURSOR;

  // An uploaded logo doubles as the favicon unless one is set explicitly.
  const faviconUrl =
    (await usableImage(settings.site_favicon_url?.trim() || null)) ?? logoUrl ?? '/favicon.svg';

  // Uploaded filenames already carry a timestamp, so the URL changes whenever
  // the admin replaces the icon — which is what forces browsers to drop the
  // cached one. The built-in SVG has a fixed name, so version it explicitly.
  const faviconHref = faviconUrl.startsWith('/uploads/')
    ? faviconUrl
    : `${faviconUrl}?v=2`;

  // A logo drawn for a dark header reads as a black box on a white page. If
  // the admin has supplied a light-background version, use it; if not, the
  // dark one is still rendered, but on a dark chip so it looks deliberate
  // rather than broken. See `Logo`.
  const headerLogoUrl = theme === 'light' ? logoLightUrl ?? logoUrl : logoUrl;

  // The chip is for an *uploaded* lockup drawn against black. The bundled one
  // is ours and reads correctly on white, so putting it on a chip just added
  // a black rectangle to the header — tall enough, with its padding, to crowd
  // the navigation beside it.
  const logoNeedsDarkChip =
    theme === 'light' && !logoLightUrl && Boolean(storedLogo);

  return {
    theme,
    logoUrl,
    logoLightUrl,
    cursor,
    headerLogoUrl,
    logoNeedsDarkChip,
    faviconUrl,
    faviconHref,
    siteName: settings.site_name?.trim() || 'DRS 3D WORLD',
  };
});
