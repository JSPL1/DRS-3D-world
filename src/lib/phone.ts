/**
 * Indian mobile numbers, stored one way.
 *
 * Customers type the same number half a dozen ways — `+91 98610 00001`,
 * `098610-00001`, `9861000001`. Sign-in accepts a mobile number, so every one
 * of those has to land on the same row: the stored form is the bare ten-digit
 * subscriber number, and both writes and lookups go through here.
 */

const NON_DIGITS = /\D+/g;

/** Ten digits, starting 6–9 — the current mobile series. */
const MOBILE = /^[6-9]\d{9}$/;

export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;

  let digits = input.replace(NON_DIGITS, '');

  // Strip the country code, however it was written: +91, 0091, or 91-prefixed.
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith('0091')) digits = digits.slice(4);
  // A single leading zero is the old trunk prefix.
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  return digits.length ? digits : null;
}

export function isMobileNumber(input: string): boolean {
  const digits = normalisePhone(input);
  return digits !== null && MOBILE.test(digits);
}

/**
 * Does this look like someone trying to sign in with a phone number rather
 * than an email? Anything without an `@` is treated as a number, so a typo'd
 * email produces "check your number" rather than a confusing email error.
 */
export function looksLikePhone(identifier: string): boolean {
  return !identifier.includes('@');
}
