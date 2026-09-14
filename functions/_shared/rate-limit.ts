// 单实例内存限流：Pages 各实例各记各的，只防同一实例被连续灌，跨实例配额靠 Cloudflare 侧规则兜底

export interface RateLimiterOptions {
  max: number;
  windowMs: number;
  entriesMax: number;
}

type RateLimitHit = { count: number; resetAt: number };

export function createRateLimiter({
  max,
  windowMs,
  entriesMax,
}: RateLimiterOptions): (key: string) => boolean {
  const hits = new Map<string, RateLimitHit>();

  return (key: string): boolean => {
    const now = Date.now();

    // 表满时只清过期项：整表清空会让攻击者用大量不同 key 一次性把限流洗白
    if (hits.size >= entriesMax) {
      for (const [entryKey, record] of hits) {
        if (now > record.resetAt) hits.delete(entryKey);
      }
    }

    const record = hits.get(key);
    if (!record || now > record.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }
    record.count += 1;
    return record.count > max;
  };
}
