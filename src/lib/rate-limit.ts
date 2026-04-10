/**
 * Simple in-memory sliding-window rate limiter.
 * Works per server instance (resets on cold start — acceptable for this app).
 * For multi-instance / production use, replace with Upstash Redis.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

/**
 * Returns true if the key is within the allowed rate, false if exceeded.
 * Key is typically an IP address concatenated with a route identifier.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  if (entry.count >= opts.limit) {
    return false;
  }

  entry.count += 1;
  return true;
}
