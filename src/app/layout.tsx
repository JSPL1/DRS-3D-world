import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';

import { getBranding } from '@/lib/branding';
import { site } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

// The theme and logo live in the database and are editable by the admin, so
// the shell can't be statically frozen at build time.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const branding = getBranding();

  return {
    metadataBase: new URL(site.url),
    title: {
      default: `${site.name} — ${site.tagline} in Bhubaneswar`,
      template: `%s | ${site.name}`,
    },
    description: site.description,
    keywords: [
      '3D printing Bhubaneswar', '3D printing Odisha', '3D design', 'rapid prototyping',
      'model making', 'product development', 'custom 3D printing', 'STL printing',
      'architectural models', 'medical models', 'corporate gifts', 'custom figurines',
    ],
    authors: [{ name: site.name }],
    creator: site.name,
    icons: {
      icon: branding.faviconHref,
      shortcut: branding.faviconHref,
      apple: branding.faviconHref,
    },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      url: site.url,
      siteName: site.name,
      title: `${site.name} — ${site.tagline}`,
      description: site.slogan,
      images: [
        {
          url: branding.logoUrl ?? '/api/tile?title=DRS%203D%20WORLD&seed=1&w=1200&h=630',
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${site.name} — ${site.tagline}`,
      description: site.slogan,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    alternates: { canonical: '/' },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const branding = getBranding();

  return {
    themeColor: branding.theme === 'light' ? '#f6f6f8' : '#050506',
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = getBranding();

  return (
    <html
      lang="en"
      data-theme={branding.theme}
      className={`${inter.variable} ${outfit.variable}`}
    >
      <body className="grain min-h-dvh antialiased">{children}</body>
    </html>
  );
}
