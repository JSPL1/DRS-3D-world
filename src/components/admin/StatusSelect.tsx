'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { cn } from '@/lib/cn';

/** Inline status dropdown that persists on change. */
export function StatusSelect({
  entity,
  id,
  value,
  options,
  className,
}: {
  entity: string;
  id: number;
  value: string;
  options: readonly string[];
  className?: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  async function change(next: string) {
    const previous = current;
    setCurrent(next); // optimistic
    setFailed(false);

    const res = await fetch('/api/admin/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, id, value: next }),
    });

    if (!res.ok) {
      setCurrent(previous); // roll back so the UI never lies about what was saved
      setFailed(true);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      aria-label="Change status"
      className={cn(
        'h-8 rounded-lg border px-2.5 text-[12px] capitalize transition-colors',
        'bg-[var(--surface-sunken)] text-ink-100',
        'focus:border-flame-500/60 focus:outline-none disabled:opacity-60',
        failed ? 'border-red-500/60' : 'border-ink-700',
        className,
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

/**
 * On/off switch that persists immediately.
 *
 * Deliberately styled with solid colours and an explicit border rather than
 * translucent white overlays — on a glass card those overlays wash out until
 * the track and the knob are the same colour, which is exactly how this
 * control became unreadable. The state is also spelled out in text beside it,
 * so the meaning never rests on colour alone.
 */
export function ToggleSwitch({
  entity,
  id,
  value,
  label,
  onLabel = 'On',
  offLabel = 'Off',
  showState = true,
}: {
  entity: string;
  id: number;
  value: boolean;
  label: string;
  onLabel?: string;
  offLabel?: string;
  showState?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(value);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  async function toggle() {
    const next = !on;
    setOn(next);
    setFailed(false);
    setPending(true);

    try {
      const res = await fetch('/api/admin/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, id, value: next }),
      });

      if (!res.ok) {
        setOn(!next); // roll back
        setFailed(true);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setOn(!next);
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={pending}
        onClick={toggle}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-500',
          'disabled:cursor-wait disabled:opacity-70',
          on
            ? 'border-flame-800 bg-flame-700'
            : 'border-ink-500 bg-ink-600',
          failed && 'border-red-500',
        )}
      >
        {/* Literal #fff, not `bg-white`: the light theme redefines the `white`
            token to near-black for body copy, but a switch knob must stay
            white in both themes. The ring keeps its edge defined against the
            lighter "off" track. */}
        <span
          aria-hidden
          className={cn(
            'absolute top-[3px] block h-[16px] w-[16px] rounded-full bg-[#ffffff]',
            'shadow-sm ring-1 ring-black/20',
            'transition-transform duration-300 ease-[var(--ease-out-expo)]',
            on ? 'translate-x-[23px]' : 'translate-x-[3px]',
          )}
        />
      </button>

      {showState && (
        <span
          className={cn(
            'w-14 text-[11.5px] font-medium tabular-nums',
            on ? 'text-flame-500' : 'text-ink-400',
          )}
        >
          {failed ? 'Failed' : on ? onLabel : offLabel}
        </span>
      )}
    </span>
  );
}
