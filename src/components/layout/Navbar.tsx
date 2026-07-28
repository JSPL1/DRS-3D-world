'use client';

import { AnimatePresence, motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, Phone, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { CartButton } from '@/components/cart/CartButton';
import { AccountMenu, type HeaderUser } from '@/components/layout/AccountMenu';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/cn';
import { site } from '@/lib/site';

export function Navbar({
  logoUrl = null,
  logoOnDarkChip = false,
  user = null,
}: {
  logoUrl?: string | null;
  logoOnDarkChip?: boolean;
  user?: HeaderUser | null;
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
          scrolled ? 'py-2.5' : 'py-5',
        )}
      >
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <nav
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 transition-all duration-500 ease-[var(--ease-out-expo)] sm:px-5',
              scrolled ? 'glass-strong h-14 shadow-lift' : 'h-16 border-transparent bg-transparent',
            )}
          >
            <Link href="/" aria-label={`${site.name} home`} className="shrink-0">
              <Logo src={logoUrl} alt={site.name} onDarkChip={logoOnDarkChip} />
            </Link>

            <div className="hidden items-center gap-0.5 xl:flex">
              {site.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-300',
                    isActive(item.href) ? 'text-white' : 'text-ink-300 hover:text-white',
                  )}
                >
                  {item.label}
                  {isActive(item.href) && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-2.5 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-flame-500 to-transparent"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/search"
                aria-label="Search"
                className="hidden h-9 w-9 items-center justify-center rounded-lg text-ink-300 transition-colors hover:bg-white/5 hover:text-white sm:flex"
              >
                <Search className="h-[18px] w-[18px]" />
              </Link>

              <CartButton />

              <AccountMenu user={user} />

              <a
                href={`tel:${site.contact.phoneIntl}`}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-200 transition-colors hover:text-white lg:flex"
              >
                <Phone className="h-4 w-4 text-flame-500" />
                {site.contact.phone}
              </a>

              <ButtonLink href="/quote" size="sm" className="hidden sm:inline-flex">
                Instant quote
              </ButtonLink>

              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/5 xl:hidden"
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
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-2xl xl:hidden"
          >
            <div className="flex h-full flex-col justify-center px-8 pt-20">
              {site.nav.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 + i * 0.045, ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'block border-b border-white/5 py-4 font-display text-3xl font-semibold tracking-tight transition-colors sm:text-4xl',
                      isActive(item.href) ? 'text-flame-500' : 'text-white hover:text-flame-400',
                    )}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-10 flex flex-col gap-3"
              >
                {user && (
                  <p className="mb-1 text-[15px] text-ink-300">
                    Hi <span className="font-semibold text-white">{user.name.trim().split(/\s+/)[0]}</span>
                  </p>
                )}

                <ButtonLink href="/quote" size="lg" className="w-full">
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
