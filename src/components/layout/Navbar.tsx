'use client';

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, Phone, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CartButton } from '@/components/cart/CartButton';
import { AccountMenu, type HeaderUser } from '@/components/layout/AccountMenu';
import { MegaMenu, type MegaCategory } from '@/components/layout/MegaMenu';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { site } from '@/lib/site';

const SECONDARY_NAV = [
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export function Navbar({
  logoUrl = null,
  logoOnDarkChip = false,
  user = null,
  categories = [],
}: {
  logoUrl?: string | null;
  logoOnDarkChip?: boolean;
  user?: HeaderUser | null;
  categories?: MegaCategory[];
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24));

  // Close the mobile sheet whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // The sheet is a focus trap of sorts — stop the page behind it from scrolling.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-out-expo)]',
          scrolled ? 'py-2.5' : 'py-4',
        )}
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <nav
            className={cn(
              'flex items-center gap-2 rounded-2xl px-3 transition-all duration-500 ease-[var(--ease-out-expo)] sm:px-4',
              'border border-ink-800 bg-[var(--surface)] shadow-lift',
              scrolled ? 'h-14' : 'h-16',
            )}
          >
            <Link href="/" aria-label={`${site.name} home`} className="shrink-0 pr-1">
              <Logo src={logoUrl} alt={site.name} onDarkChip={logoOnDarkChip} />
            </Link>

            <div className="hidden items-center gap-0.5 xl:flex">
              <Link
                href="/"
                className={cn(
                  'rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                  isActive('/') && pathname === '/' ? 'text-ink-100' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
                )}
              >
                Home
              </Link>
              <MegaMenu categories={categories} />
              {SECONDARY_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors',
                    isActive(item.href) ? 'text-ink-100' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Link
                href="/search"
                aria-label="Search"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100 sm:flex"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>

              <CartButton />

              <AccountMenu user={user} />

              <a
                href={`tel:${site.contact.phoneIntl}`}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-300 transition-colors hover:text-ink-100 lg:flex"
              >
                <Phone className="h-4 w-4 text-flame-600" />
                {site.contact.phone}
              </a>

              <ButtonLink href="/quote" variant="accent" size="sm" className="hidden sm:inline-flex">
                Instant quote
              </ButtonLink>

              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-100 transition-colors hover:bg-ink-850 xl:hidden"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[var(--bg)] xl:hidden"
          >
            <div className="flex h-full flex-col justify-center px-8 pt-20">
              {[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/products' }, ...SECONDARY_NAV, { label: 'Instant quote', href: '/quote' }].map(
                (item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + i * 0.045, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        'block border-b border-ink-800 py-4 font-display text-3xl font-bold tracking-tight transition-colors sm:text-4xl',
                        isActive(item.href) ? 'text-flame-700' : 'text-ink-100 hover:text-flame-700',
                      )}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ),
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-10 flex flex-col gap-3"
              >
                {user && (
                  <p className="mb-1 text-[15px] text-ink-400">
                    Hi <span className="font-semibold text-ink-100">{user.name.trim().split(/\s+/)[0]}</span>
                  </p>
                )}

                <ButtonLink href="/quote" variant="accent" size="lg" className="w-full">
                  Get an instant quote
                </ButtonLink>

                {user ? (
                  <ButtonLink href="/account" variant="secondary" size="lg" className="w-full">
                    Your orders
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/login" variant="secondary" size="lg" className="w-full">
                    Sign in
                  </ButtonLink>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
