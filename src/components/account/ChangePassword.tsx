'use client';

import { KeyRound } from 'lucide-react';
import { useState } from 'react';

import { Field, FormError, FormNotice } from '@/components/ui/Field';

/**
 * Changing your own password.
 *
 * Open to everyone signed in, administrators included. Before this the only
 * ways to a new password were the emailed reset code or asking an
 * administrator to set one — and an administrator had no way at all.
 *
 * The current password is asked for because the server requires it: without
 * it, an unattended browser is enough to lock the real owner out.
 */
export function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Checked here as well so a typo in the confirmation is caught without a
    // round trip; the server does the real validation.
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Could not change your password.');
        return;
      }

      setNotice(data.message ?? 'Password changed.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      setError('Network problem. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-2xl p-6 sm:p-7">
      <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
        <KeyRound className="h-5 w-5 text-flame-500" />
        Change your password
      </h2>
      <p className="mt-2 text-[13.5px] text-ink-400">
        You will stay signed in here. Every other device is signed out.
      </p>

      <div className="mt-5 grid gap-4 sm:max-w-md">
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <Field
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with an upper-case letter, a lower-case letter and a number."
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      {error && <div className="mt-4 sm:max-w-md"><FormError message={error} /></div>}
      {notice && <div className="mt-4 sm:max-w-md"><FormNotice message={notice} /></div>}

      <button
        type="submit"
        disabled={pending || !current || !next || !confirm}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-[13.5px] font-medium text-white transition-colors hover:bg-flame-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}
