import { CartProvider } from '@/components/cart/CartProvider';
import { Footer } from '@/components/layout/Footer';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { Navbar } from '@/components/layout/Navbar';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { Cursor } from '@/components/ui/Cursor';
import { canAccessAdmin } from '@/lib/auth/roles';
import { getCurrentUser } from '@/lib/auth/session';
import { getBranding } from '@/lib/branding';
import { getCategories } from '@/lib/queries';
import { site } from '@/lib/site';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  const categories = await getCategories();

  // Resolved on the server so the header is correct in the first response —
  // reading it on the client would flash "Sign in" at someone who is signed
  // in, on every page load.
  const current = await getCurrentUser();
  const user = current
    ? {
        name: current.name,
        email: current.email,
        adminHref: canAccessAdmin(current.role) ? '/admin' : null,
      }
    : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.contact.phoneIntl,
    email: site.contact.email,
    slogan: site.slogan,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${site.contact.address.line1}, ${site.contact.address.line2}`,
      addressLocality: site.contact.address.city,
      postalCode: site.contact.address.postalCode,
      addressRegion: site.contact.address.state,
      addressCountry: 'IN',
    },
    makesOffer: site.services.map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s.title },
    })),
  };

  return (
    <CartProvider>
    <SmoothScroll>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Cursor variant={branding.cursor} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-flame-700 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar
        logoUrl={branding.headerLogoUrl}
        logoOnDarkChip={branding.logoNeedsDarkChip}
        user={user}
        categories={categories.map((c) => ({ name: c.name, slug: c.slug, count: c.product_count }))}
      />
      <main id="main" className="pb-16 sm:pb-0">{children}</main>
      <Footer logoUrl={branding.headerLogoUrl} logoOnDarkChip={branding.logoNeedsDarkChip} />
      <MobileTabBar signedIn={Boolean(user)} />
    </SmoothScroll>
    </CartProvider>
  );
}
