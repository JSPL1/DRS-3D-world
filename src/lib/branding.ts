import 'server-only';

import { DEFAULT_CURSOR, isCursorVariant, type CursorVariant } from '@/lib/cursor';
import { getSettings } from '@/lib/queries';

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

export function getBranding(): Branding {
  const settings = getSettings();

  const theme: Theme = settings.site_theme === 'light' ? 'light' : 'dark';
  const logoUrl = settings.site_logo_url?.trim() || null;
  const logoLightUrl = settings.site_logo_light_url?.trim() || null;

  const cursorSetting = settings.site_cursor?.trim();
  const cursor: CursorVariant = isCursorVariant(cursorSetting) ? cursorSetting : DEFAULT_CURSOR;

  // An uploaded logo doubles as the favicon unless one is set explicitly.
  const faviconUrl = settings.site_favicon_url?.trim() || logoUrl || '/favicon.svg';

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
}
