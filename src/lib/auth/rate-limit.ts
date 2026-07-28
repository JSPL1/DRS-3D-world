import 'server-only';

/**
 * In-memory fixed-window limiter.
 *
 * Adequate for a single Render instance, which is what this app runs as.
 * If the service is ever scaled horizontally this needs to move to shared
 * storage — the per-process counters would otherwise let N instances allow
 * N times the intended rate.
 */

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as { __drsBuckets?: Map<string, Bucket> };
const buckets = (globalForLimiter.__drsBuckets ??= new Map<string, Bucket>());

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds };
}

/** Opportunistic cleanup so the map can't grow without bound. */
export function sweepRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
