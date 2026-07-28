'use client';

import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useId, useState, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function Field({
  label,
  error,
  hint,
  className,
  type = 'text',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-200">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            'h-12 w-full rounded-xl border bg-white/[0.03] px-4 text-[14.5px] text-white',
            'placeholder:text-ink-500 transition-all duration-300',
            'focus:border-flame-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-flame-500/10',
            isPassword && 'pr-12',
            error ? 'border-red-500/60' : 'border-white/10 hover:border-white/20',
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 transition-colors hover:text-white"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-[12.5px] text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function FormNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-flame-500/25 bg-flame-500/10 px-4 py-3 text-[13px] text-flame-300"
    >
      {message}
    </div>
  );
}
