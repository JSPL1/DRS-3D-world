import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

import { Logo, LogoMark } from '@/components/ui/Logo';
import { site, whatsappLink } from '@/lib/site';

const COLUMNS = [
  {
    title: 'Services',
    links: site.services.filter((s) => s.primary).map((s) => ({ label: s.title, href: `/services#${s.slug}` })),
  },
  {
    title: 'Explore',
    links: [
      { label: 'Products', href: '/products' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Videos', href: '/videos' },
      { label: 'Industries', href: '/industries' },
      { label: 'Blog', href: '/blog' },
      { label: 'Instant quote', href: '/quote' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export function Footer({
  logoUrl = null,
  logoOnDarkChip = false,
}: {
  logoUrl?: string | null;
  logoOnDarkChip?: boolean;
}) {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/5">
      {/* Warm floor glow, echoing a heated bed */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-flame-500/10 blur-[120px]"
      />

      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            {logoUrl ? (
              <Logo src={logoUrl} alt={site.name} className="h-14" onDarkChip={logoOnDarkChip} />
            ) : (
              <div className="flex items-center gap-3">
                <LogoMark className="h-11 w-11 text-white" />
                <div>
                  <p className="font-display text-xl font-bold tracking-tight">
                    DRS <span className="text-flame-500">3D</span> WORLD
                  </p>
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-400">
                    {site.tagline}
                  </p>
                </div>
              </div>
            )}

            <p className="mt-5 font-display text-lg leading-snug text-ink-100">
              Bringing your ideas to life,{' '}
              <span className="text-flame-500">one layer at a time.</span>
            </p>

            <div className="mt-7 space-y-3 text-sm text-ink-300">
              <a
                href={`tel:${site.contact.phoneIntl}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0 text-flame-500" />
                {site.contact.phone}
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-flame-500" />
                {site.contact.email}
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-flame-500" />
                <span>
                  {site.contact.address.line1}, {site.contact.address.line2}
                  <br />
                  {site.contact.address.city}, {site.contact.address.postalCode}
                  <br />
                  {site.contact.address.state}, {site.contact.address.country}
                </span>
              </p>
            </div>

            <a
              href={whatsappLink('Hello DRS 3D WORLD, I would like to discuss a project.')}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-flame-500/30 bg-flame-500/10 px-4 py-2.5 text-sm font-medium text-flame-400 transition-colors hover:bg-flame-500/20"
            >
              Chat on WhatsApp
            </a>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-400">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-ink-300 transition-colors hover:text-white"
                    >
                      <span className="h-px w-0 bg-flame-500 transition-all duration-300 group-hover:w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-ink-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.legalName}. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-flame-500" />
            </span>
            Printers running in Bhubaneswar
          </p>
        </div>
      </div>
    </footer>
  );
}
