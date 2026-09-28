import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type MemoryEntry = {
  value: unknown;
  expiresAt: number;
};

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedis ? Redis.fromEnv() : null;

const memoryCache = new Map<string, MemoryEntry>();
const memoryRate = new Map<string, { count: number; resetAt: number }>();

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(12, "5 m"),
      prefix: "faizan-portfolio-chat",
      timeout: 800
    })
  : null;

function pruneMemoryCache() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    if (redis) return (await redis.get<T>(key)) ?? null;

    pruneMemoryCache();
    const entry = memoryCache.get(key);
    return entry && entry.expiresAt > Date.now() ? (entry.value as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    if (redis) {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    }

    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  } catch {
    // Cache failures must never make the chatbot unavailable.
  }
}

export async function rateLimit(identifier: string) {
  if (ratelimit) {
    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset
    };
  }

  const now = Date.now();
  const current = memoryRate.get(identifier);

  if (!current || current.resetAt <= now) {
    const resetAt = now + 5 * 60 * 1000;
    memoryRate.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: 11, reset: resetAt };
  }

  current.count += 1;
  return {
    success: current.count <= 12,
    remaining: Math.max(0, 12 - current.count),
    reset: current.resetAt
  };
}

export function cacheConfigured() {
  return Boolean(redis);
}
