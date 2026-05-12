import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export const loginLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, "15 m"), prefix: "adv:login" })
  : null;

export const leadLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, "1 h"), prefix: "adv:lead" })
  : null;

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export async function checkLimit(limiter: Ratelimit | null, key: string): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: Infinity }; // dev fallback without KV
  const r = await limiter.limit(key);
  return { success: r.success, remaining: r.remaining };
}
