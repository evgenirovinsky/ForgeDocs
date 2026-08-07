import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.VALKEY_URL ?? "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = 60,
): Promise<void> {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // cache is best-effort
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (redis.status !== "ready") {
      await redis.connect().catch(() => undefined);
    }
    await redis.del(key);
  } catch {
    // ignore
  }
}

export function exportJobCacheKey(jobId: string): string {
  return `export-job:${jobId}`;
}
