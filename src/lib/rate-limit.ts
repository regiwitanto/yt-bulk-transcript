/**
 * Rate limiter that uses Upstash Redis in production (multi-instance safe)
 * and falls back to an in-memory sliding window in development.
 *
 * Production setup: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * in your environment (Vercel dashboard / .env.local). The free Upstash tier
 * is plenty for this app.
 *
 * @see https://console.upstash.com
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  /** Max requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

// ---------------------------------------------------------------------------
// In-memory fallback (development / missing env vars)
// ---------------------------------------------------------------------------

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, InMemoryEntry>();

function checkInMemory(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  if (entry.count >= opts.limit) return false;

  entry.count += 1;
  return true;
}

// ---------------------------------------------------------------------------
// Upstash Redis (production)
// ---------------------------------------------------------------------------

/**
 * Converts milliseconds to the Upstash Duration format: "{n} {unit}"
 * e.g. 60_000 → "1 m", 30_000 → "30 s", 500 → "500 ms"
 */
function msToDuration(ms: number): `${number} ${"ms" | "s" | "m" | "h"}` {
  if (ms % (60 * 60_000) === 0) return `${ms / (60 * 60_000)} h`;
  if (ms % 60_000 === 0) return `${ms / 60_000} m`;
  if (ms % 1_000 === 0) return `${ms / 1_000} s`;
  return `${ms} ms`;
}

function makeUpstashLimiter(opts: RateLimitOptions): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(opts.limit, msToDuration(opts.windowMs)),
    analytics: false,
    prefix: "yt-bulk-transcript",
  });
}

// Cache limiters by key pattern so we don't recreate on every request
const limiterCache = new Map<string, Ratelimit | null>();

function getLimiter(opts: RateLimitOptions): Ratelimit | null {
  const cacheKey = `${opts.limit}:${opts.windowMs}`;
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(cacheKey, makeUpstashLimiter(opts));
  }
  return limiterCache.get(cacheKey)!;
}

// ---------------------------------------------------------------------------
// Public API — identical signature to the old implementation
// ---------------------------------------------------------------------------

/**
 * Returns true if the key is within the allowed rate, false if exceeded.
 * Key is typically an IP address or user ID concatenated with a route identifier.
 *
 * Automatically uses Upstash Redis when env vars are present (production),
 * otherwise falls back to in-memory (development).
 */
export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
): Promise<boolean> {
  const limiter = getLimiter(opts);

  if (!limiter) {
    // Dev fallback — synchronous in-memory check
    return checkInMemory(key, opts);
  }

  const { success } = await limiter.limit(key);
  return success;
}
