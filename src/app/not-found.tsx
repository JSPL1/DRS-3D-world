import Link from 'next/link';

import { LogoMark } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flame-500/10 blur-[120px]"
      />

      <div className="relative">
        <LogoMark className="mx-auto h-14 w-14 text-white" />

        <p className="mt-8 font-display text-[16vw] font-bold leading-none tracking-tighter text-white/[0.06] sm:text-[10rem]">
          404
        </p>

        <h1 className="-mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          This one didn’t print
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-300">
          The page you were looking for isn’t here. It may have moved, or the link may have been
          mistyped.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-flame-700 px-6 text-sm font-medium text-white transition-colors hover:bg-flame-800"
          >
            Back to the homepage
          </Link>
          <Link
            href="/products"
            className="glass inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Browse products
          </Link>
        </div>
      </div>
    </div>
  );
}
