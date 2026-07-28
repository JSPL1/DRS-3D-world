'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Package, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

export type HeaderUser = {
  name: string;
  email: string;
  /** Set for staff, so the panel is one click away rather than a typed URL. */
  adminHref: string | null;
};

/**
 * Who you are, in the header.
 *
 * Signed out it is a plain "Sign in" link. Signed in it greets you by first
 * name — the point is that a returning customer can tell at a glance that
 * their basket, addresses and order history are the ones attached to them,
 * without opening a page to find out.
 */
export function AccountMenu({ user }: { user: HeaderUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Route changes close the menu; so does clicking anywhere else, and Escape.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname || '/')}`}
        className="hidden items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-200 transition-colors hover:text-white sm:inline-flex"
      >
        <User className="h-4 w-4 text-flame-500" />
        Sign in
      </Link>
    );
  }

  // "Sushanta Dash" → "Sushanta". A header is not the place for a full legal
  // name, and long ones push the nav around.
  const firstName = user.name.trim().split(/\s+/)[0];
  const initial = firstName.charAt(0).toUpperCase();

  async function signOut() {
    setPending(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 text-[13px] font-medium transition-colors',
          open ? 'bg-white/10 text-white' : 'text-ink-200 hover:bg-white/5 hover:text-white',
        )}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-full bg-flame-700 text-[12px] font-bold text-[#ffffff]"
        >
          {initial}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">Hi {firstName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong absolute right-0 top-[calc(100%+10px)] z-50 w-60 origin-top-right overflow-hidden rounded-xl p-1.5 shadow-lift"
          >
            <div className="border-b border-white/8 px-3 py-2.5">
              <p className="truncate text-[13px] font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11.5px] text-ink-400">{user.email}</p>
            </div>

            <Link
              href="/account"
              role="menuitem"
              className="mt-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Package className="h-4 w-4 text-flame-500" />
              Your orders
            </Link>

            {user.adminHref && (
              <Link
                href={user.adminHref}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] text-ink-200 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4 text-flame-500" />
                Admin panel
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={pending}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-ink-200 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {pending ? 'Signing out…' : 'Sign out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
