type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Small in-process guard for preview deployments. Production should replace
 * this with a durable edge-compatible rate limiter before high-volume launch.
 */
export function checkRateLimit(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetsAt: now + windowMs };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetsAt: current.resetsAt };
}
