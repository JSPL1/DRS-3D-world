'use client';

import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { FormError, FormNotice } from '@/components/ui/Field';

export type SettingField = {
  key: string;
  label: string;
  hint?: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'password';
  suffix?: string;
  /** Required when type is 'select'. */
  options?: Array<{ value: string; label: string }>;
};

export type SettingGroup = {
  title: string;
  description: string;
  fields: SettingField[];
};

export function SettingsForm({
  groups,
  initial,
}: {
  groups: SettingGroup[];
  initial: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const keys = groups.flatMap((g) => g.fields.map((f) => f.key));
  const dirty = keys.some((key) => (values[key] ?? '') !== (initial[key] ?? ''));

  // A stored secret never reaches the browser; the server sends a sentinel in
  // its place. Leaving the field untouched must keep the existing value, so
  // the sentinel is stripped from the payload rather than saved over it.
  const secretKeys = new Set(
    groups.flatMap((g) => g.fields.filter((f) => f.type === 'password').map((f) => f.key)),
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    try {
      const payload = Object.fromEntries(
        keys
          // An untouched secret still holds the sentinel the server sent in
          // place of the real value. Sending it back would overwrite the
          // stored password with the mask.
          .filter((key) => !(secretKeys.has(key) && (values[key] ?? '') === (initial[key] ?? '')))
          .map((key) => [key, values[key] ?? '']),
      );

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save settings.');
        return;
      }

      setNotice(`Saved ${data.saved} settings. The website has been updated.`);
      router.refresh();
    } catch {
      setError('Network problem. Your changes were not saved.');
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    'h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[14px] text-white ' +
    'placeholder:text-ink-500 transition-colors focus:border-flame-500/60 focus:outline-none focus:ring-4 focus:ring-flame-500/10';

  return (
    <form onSubmit={save} className="pb-24">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-400">
          {dirty ? 'You have unsaved changes.' : 'Everything is saved.'}
        </p>
        <Button type="submit" size="md" disabled={pending || !dirty}>
          <Save className="h-4 w-4" />
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
      </div>

      {error && <div className="mb-5"><FormError message={error} /></div>}
      {notice && <div className="mb-5"><FormNotice message={notice} /></div>}

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.title} className="glass rounded-2xl p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">{group.title}</h2>
            <p className="mt-1 text-[12.5px] text-ink-500">{group.description}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <label
                  key={field.key}
                  className={`flex flex-col gap-1.5 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}
                >
                  <span className="text-[12.5px] font-medium text-ink-300">{field.label}</span>

                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      className={`${inputClass} h-auto py-3 leading-relaxed`}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={values[field.key] ?? field.options?.[0]?.value ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      className={inputClass}
                    >
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="relative">
                      <input
                        type={
                          field.type === 'number'
                            ? 'number'
                            : field.type === 'password'
                              ? 'password'
                              : 'text'
                        }
                        autoComplete={field.type === 'password' ? 'new-password' : undefined}
                        step="any"
                        value={values[field.key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                        className={`${inputClass} ${field.suffix ? 'pr-12' : ''}`}
                      />
                      {field.suffix && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-ink-500">
                          {field.suffix}
                        </span>
                      )}
                    </span>
                  )}

                  {field.hint && <span className="text-[11.5px] text-ink-500">{field.hint}</span>}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}
