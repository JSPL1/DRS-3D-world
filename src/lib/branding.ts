import 'server-only';

import { cache } from 'react';

import { DEFAULT_CURSOR, isCursorVariant, type CursorVariant } from '@/lib/cursor';
import { getSettings } from '@/lib/queries';
import { resolveUploadFile } from '@/lib/uploads';

/** The lockup that ships with the code, so there is always something to draw. */
const BUNDLED_LOGO = '/brand/logo.png';

/**
 * An uploaded image the host no longer has resolves to the bundled logo.
 *
 * Uploads live on a data disk outside the app directory, and moving hosts —
 * or any host that wipes that directory on deploy — leaves the settings row
 * pointing at a file that is simply gone. The result was a broken image where
 * the studio's logo should be. Falling back keeps the header intact until
 * somebody re-uploads, and costs one stat call on a request-cached path.
 */
function usableImage(url: string | null): string | null {
  if (!url) return null;
  if (!url.startsWith('/uploads/')) return url;

  const name = url.slice('/uploads/'.length);
  return resolveUploadFile([name]) ? url : null;
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

  // Anything the host cannot actually serve is treated as absent, so the
  // bundled lockup stands in rather than a broken image.
  const logoUrl = usableImage(settings.site_logo_url?.trim() || null) ?? BUNDLED_LOGO;
  const logoLightUrl = usableImage(settings.site_logo_light_url?.trim() || null);

  const cursorSetting = settings.site_cursor?.trim();
  const cursor: CursorVariant = isCursorVariant(cursorSetting) ? cursorSetting : DEFAULT_CURSOR;

  // An uploaded logo doubles as the favicon unless one is set explicitly.
  const faviconUrl =
    usableImage(settings.site_favicon_url?.trim() || null) ?? logoUrl ?? '/favicon.svg';

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
  const logoNeedsDarkChip = theme === 'light' && !logoLightUrl && Boolean(logoUrl);

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
