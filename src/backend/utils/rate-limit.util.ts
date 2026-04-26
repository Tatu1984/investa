/**
 * Sliding-window rate limiter with two backends:
 *   - Upstash (distributed) when UPSTASH_REDIS_REST_URL + TOKEN are set
 *   - In-memory (single-instance) otherwise
 *
 * The decision is made lazily per process; the API surface (check, limitHeaders, RULES)
 * is identical regardless of backend so callers don't need to care.
 */

interface LimitResult {
  allowed: boolean;
  remaining: number;
  resetAfterSec: number;
  limit: number;
}

export interface RateLimit {
  /** Key prefix (e.g. "login", "signup"). */
  name: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

// ---------- in-memory backend ----------

interface Entry { timestamps: number[]; }
const BUCKETS = new Map<string, Entry>();

function checkInMemory(key: string, rule: RateLimit): LimitResult {
  const now = Date.now();
  const windowMs = rule.windowSec * 1000;
  const bucketKey = `${rule.name}:${key}`;
  const entry = BUCKETS.get(bucketKey) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
  const allowed = entry.timestamps.length < rule.limit;
  if (allowed) entry.timestamps.push(now);
  BUCKETS.set(bucketKey, entry);
  const oldest = entry.timestamps[0] ?? now;
  const resetAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
  return { allowed, remaining: Math.max(0, rule.limit - entry.timestamps.length), resetAfterSec, limit: rule.limit };
}

if (typeof setInterval !== "undefined" && !(globalThis as { __investaRlGc?: boolean }).__investaRlGc) {
  (globalThis as { __investaRlGc?: boolean }).__investaRlGc = true;
  setInterval(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [k, v] of BUCKETS.entries()) {
      v.timestamps = v.timestamps.filter((ts) => ts > cutoff);
      if (v.timestamps.length === 0) BUCKETS.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

// ---------- upstash backend ----------

interface UpstashAdapter {
  check(key: string, rule: RateLimit): Promise<LimitResult>;
}

let upstashAdapter: UpstashAdapter | null | undefined;

async function getUpstashAdapter(): Promise<UpstashAdapter | null> {
  if (upstashAdapter !== undefined) return upstashAdapter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    upstashAdapter = null;
    return null;
  }
  try {
    const [{ Redis }, { Ratelimit }] = await Promise.all([
      import("@upstash/redis"),
      import("@upstash/ratelimit"),
    ]);
    const redis = new Redis({ url, token });
    const cache = new Map<string, InstanceType<typeof Ratelimit>>();
    upstashAdapter = {
      async check(key, rule) {
        const cacheKey = `${rule.name}:${rule.limit}:${rule.windowSec}`;
        let limiter = cache.get(cacheKey);
        if (!limiter) {
          limiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(rule.limit, `${rule.windowSec} s`),
            prefix: "investa-rl",
            analytics: false,
          });
          cache.set(cacheKey, limiter);
        }
        const r = await limiter.limit(`${rule.name}:${key}`);
        const resetAfterSec = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
        return { allowed: r.success, remaining: Math.max(0, r.remaining), resetAfterSec, limit: rule.limit };
      },
    };
    return upstashAdapter;
  } catch {
    upstashAdapter = null;
    return null;
  }
}

// ---------- public API ----------

/**
 * Synchronous check against the in-memory backend (preserves the existing API).
 * For the Upstash backend, prefer `checkAsync()` — but synchronous check still works
 * (just per-instance) so we never block hot paths waiting for Redis on a misconfig.
 */
export function check(key: string, rule: RateLimit): LimitResult {
  return checkInMemory(key, rule);
}

/**
 * Async check that uses Upstash if configured, falling back to in-memory.
 * Use this from middleware/handlers where awaiting an extra ~5 ms is fine.
 */
export async function checkAsync(key: string, rule: RateLimit): Promise<LimitResult> {
  const adapter = await getUpstashAdapter();
  if (adapter) {
    try {
      return await adapter.check(key, rule);
    } catch {
      // Fall through to in-memory if Redis hiccups — fail-open is better than fail-closed for rate limit.
    }
  }
  return checkInMemory(key, rule);
}

export function limitHeaders(r: LimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(r.resetAfterSec),
  };
}

/** Reports which backend is active (for /status). */
export async function rateLimitBackend(): Promise<"upstash" | "memory"> {
  const a = await getUpstashAdapter();
  return a ? "upstash" : "memory";
}

export const RULES = {
  LOGIN:   { name: "login",   limit: 10,  windowSec: 60 } satisfies RateLimit,
  SIGNUP:  { name: "signup",  limit: 5,   windowSec: 3600 } satisfies RateLimit,
  REFRESH: { name: "refresh", limit: 30,  windowSec: 60 } satisfies RateLimit,
  WRITE:   { name: "write",   limit: 60,  windowSec: 60 } satisfies RateLimit,
};
