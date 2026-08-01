'use client';

import { Plus, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Field, FormError } from '@/components/ui/Field';
import { ROLE_LABELS, type Role } from '@/lib/auth/roles';

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as Role[];

/**
 * Admin-created accounts go straight to `active` — the studio vouching for
 * the address stands in for the email-verification code a self-registered
 * customer would otherwise have to enter.
 */
export function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(''); setEmail(''); setPhone(''); setRole('customer'); setPassword(''); setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, role, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not create that account.');
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError('Network problem. The account was not created.');
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-flame-700 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-flame-800"
      >
        <UserPlus className="h-4 w-4" />
        Add user
      </button>
    );
  }

  return (
    <section className="glass mb-5 rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold tracking-tight">Add a user</h2>
        <button
          type="button"
          onClick={() => { setOpen(false); reset(); }}
          aria-label="Close"
          className="rounded-lg p-1.5 text-ink-500 transition-colors hover:text-ink-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
        <Field label="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" hint="10-digit Indian mobile, if you have one." />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-200">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="h-12 rounded-xl border border-ink-700 bg-[var(--surface-sunken)] px-4 text-[14.5px] text-ink-100 focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Field
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            hint="They can change it themselves once signed in."
          />
        </div>

        {error && <div className="sm:col-span-2"><FormError message={error} /></div>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame-700 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-flame-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </section>
  );
}
