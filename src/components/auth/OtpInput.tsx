'use client';

import { useImperativeHandle, useRef, type Ref } from 'react';

export const OTP_LENGTH = 6;

export type OtpInputHandle = {
  /** Clear every box and put the caret back in the first one. */
  reset: () => void;
  focus: () => void;
};

/**
 * The six-box code entry, shared by password reset and email verification.
 *
 * Handles the two things people actually do with these: type one digit at a
 * time, and paste the whole code out of the email into whichever box happens
 * to have focus.
 */
export function OtpInput({
  digits,
  onDigitsChange,
  onComplete,
  disabled = false,
  ref,
}: {
  digits: string[];
  onDigitsChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  ref?: Ref<OtpInputHandle>;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      onDigitsChange(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    },
    focus: () => inputs.current[0]?.focus(),
  }));

  const onChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, '');

    if (!value) {
      const next = [...digits];
      next[index] = '';
      onDigitsChange(next);
      return;
    }

    // A pasted code arrives as one long value in a single box.
    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH).split('');
      const next = Array(OTP_LENGTH).fill('');
      chars.forEach((c, i) => (next[i] = c));
      onDigitsChange(next);
      inputs.current[Math.min(chars.length, OTP_LENGTH - 1)]?.focus();
      if (chars.length === OTP_LENGTH) onComplete(next.join(''));
      return;
    }

    const next = [...digits];
    next[index] = value;
    onDigitsChange(next);
    if (index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={OTP_LENGTH}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.03] text-center font-display text-2xl font-semibold text-white transition-all duration-300 focus:border-flame-500/60 focus:bg-white/[0.05] focus:outline-none focus:ring-4 focus:ring-flame-500/10 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
