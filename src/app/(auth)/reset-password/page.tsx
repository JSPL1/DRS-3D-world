'use client';

import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field, FormError } from '@/components/ui/Field';

const RULES = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'One lower-case letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'One upper-case letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'One number', test: (v: string) => /[0-9]/.test(v) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('drs-reset-ticket');
    if (!stored) {
      router.replace('/forgot-password');
      return;
    }
    setTicket(stored);
  }, [router]);

  const results = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allOk = results.every((r) => r.ok);
  const matches = password.length > 0 && password === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allOk) return setError('Please satisfy every password requirement.');
    if (!matches) return setError('The two passwords do not match.');

    setPending(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not reset your password.');
        return;
      }

      sessionStorage.removeItem('drs-reset-ticket');
      sessionStorage.removeItem('drs-reset-email');
      router.push('/login?reset=1');
    } catch {
      setError('Network problem. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          Choose something you have not used here before. Every other device will be signed out.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormError message={error} />

        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <ul className="grid gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-2">
          {results.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-[12.5px] transition-colors ${
                rule.ok ? 'text-flame-400' : 'text-ink-500'
              }`}
            >
              {rule.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {rule.label}
            </li>
          ))}
        </ul>

        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm.length > 0 && !matches ? 'These do not match.' : undefined}
        />

        <Button type="submit" size="lg" disabled={pending || !allOk || !matches} className="w-full">
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </>
  );
}
