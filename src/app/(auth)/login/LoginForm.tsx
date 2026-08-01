'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormNotice } from '@/components/ui/Field';

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: 'Google sign-in is not switched on for this site yet.',
  google_failed: 'Google sign-in did not complete. Please try again.',
  google_state_mismatch: 'That sign-in link expired. Please try again.',
  google_account_inactive: 'This account is not active. Please contact the administrator.',
};

export function LoginForm({
  nextPath,
  justReset,
  oauthError,
  googleEnabled = false,
}: {
  nextPath?: string;
  justReset?: boolean;
  oauthError?: string;
  googleEnabled?: boolean;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? OAUTH_ERRORS[oauthError] ?? 'Sign-in did not complete.' : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, remember }),
      });
      const data = await res.json();

      if (!res.ok) {
        // A registration that was never confirmed: the password was right, so
        // carry them to the code screen rather than leaving them stuck on an
        // error they cannot act on.
        if (data.needsVerification && data.email) {
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}&resent=1`);
          return;
        }
        setError(data.error ?? 'Could not sign you in.');
        return;
      }

      // Only follow `next` when it's a same-site path, so a crafted link
      // can't bounce a freshly authenticated user off to another domain.
      const safeNext =
        nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null;

      router.push(safeNext ?? data.redirectTo ?? '/admin');
      router.refresh();
    } catch {
      setError('Network problem. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-[14px] text-ink-400">
          Track your orders, reorder in a click, and check out faster.
        </p>
      </div>

      {justReset && <div className="mb-5"><FormNotice message="Your password has been updated. Sign in with it now." /></div>}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormError message={error} />

        <Field
          label="Email address or mobile number"
          type="text"
          name="identifier"
          inputMode="email"
          autoComplete="username"
          placeholder="you@company.com or 98610 00001"
          hint="Either one works — whichever you signed up with."
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-flame-500"
            />
            Remember me for 30 days
          </label>

          <Link
            href="/forgot-password"
            className="text-[13px] font-medium text-flame-500 transition-colors hover:text-flame-400"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? 'Signing in…' : 'Sign in'}
          {!pending && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-ink-800" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">or</span>
        <span className="h-px flex-1 bg-ink-800" />
      </div>

      <div className="mt-6">
        <OAuthButtons googleEnabled={googleEnabled} facebookEnabled={false} next={nextPath} />
      </div>

      <p className="mt-8 border-t border-white/5 pt-6 text-center text-[13px] text-ink-400">
        New here?{' '}
        <Link
          href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : '/register'}
          className="font-medium text-flame-500 hover:text-flame-400"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
