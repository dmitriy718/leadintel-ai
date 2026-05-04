import { TRPCError } from "@trpc/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getKey(identifier: string, action: string): string {
  return `${action}:${identifier}`;
}

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

export function rateLimit(
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number
) {
  const key = getKey(identifier, action);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many ${action} attempts. Please try again in ${retryAfter}s.`,
    });
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Helper to extract IP from request headers
export function getClientIP(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}
