// In-memory best-effort rate limiter — no external dependency.
//
// Caveat: serverless function instances are ephemeral and not shared, so this
// is not a hard cross-instance guarantee. Under Fluid Compute (which reuses warm
// instances) it reliably slows an attacker hammering the same instance — a real
// speed bump. For this site's traffic that is plenty. If the site is ever
// seriously attacked, Vercel's platform Firewall (dashboard) is the next layer.

export type Limiter = { limit: number; windowMs: number; prefix: string };

export const loginLimiter: Limiter = { limit: 5, windowMs: 15 * 60_000, prefix: "login" };
export const leadLimiter: Limiter = { limit: 20, windowMs: 60 * 60_000, prefix: "lead" };

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkLimit(
  limiter: Limiter,
  key: string,
): Promise<{ success: boolean; remaining: number }> {
  const now = Date.now();
  const bucketKey = `${limiter.prefix}:${key}`;

  let bucket = buckets.get(bucketKey);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + limiter.windowMs };
    buckets.set(bucketKey, bucket);
  }
  bucket.count += 1;

  // Opportunistic cleanup so the Map can't grow unbounded over a long-lived instance.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (now >= b.resetAt) buckets.delete(k);
    }
  }

  return {
    success: bucket.count <= limiter.limit,
    remaining: Math.max(0, limiter.limit - bucket.count),
  };
}
