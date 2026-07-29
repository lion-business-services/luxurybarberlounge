type Bucket = { count: number; resetAt: number };

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

const globalStore = globalThis as typeof globalThis & { __lblRateLimit?: Map<string, Bucket> };
const store = globalStore.__lblRateLimit ?? new Map<string, Bucket>();
globalStore.__lblRateLimit = store;

export function rateLimit({ key, limit, windowMs }: RateLimitInput) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  store.set(key, current);
  const allowed = current.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function requestFingerprint(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  const userAgent = headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent.slice(0, 80)}`;
}
