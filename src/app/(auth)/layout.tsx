import Link from 'next/link';

import { Logo } from '@/components/ui/Logo';
import { site } from '@/lib/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      {/* Backdrop */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950" />
      <div
        aria-hidden
        className="absolute -left-40 top-1/4 h-[420px] w-[420px] rounded-full bg-flame-500/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="absolute -right-32 bottom-0 h-[380px] w-[380px] rounded-full bg-flame-700/10 blur-[130px]"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] [background-size:56px_56px]"
      />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <div className="glass-strong rounded-3xl p-8 shadow-lift sm:p-10">{children}</div>

        <p className="mt-6 text-center text-xs text-ink-500">
          {site.slogan}
        </p>
      </div>
    </div>
  );
}
