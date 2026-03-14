import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Advanced Rate Limiter for Serverless Environments (Upstash Redis).
 * Fallbacks to in-memory Map for local development if environment variables are missing.
 */

// 1. Initialize Upstash Ratelimit if redis exists
let ratelimit: Ratelimit | null = null;

if (redis) {
    ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"), // Default: 10 per minute
        prefix: "@upstash/ratelimit",
    });
}

// 2. Simple in-memory fallback for Local Dev
interface RateLimitEntry {
    count: number;
    resetAt: number;
}
const localStore = new Map<string, RateLimitEntry>();

export async function checkRateLimit(
    userId: string,
    route: string,
    maxRequests: number = 10,
    windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `${userId}:${route}`;

    // A. Use Upstash Redis if configured
    if (ratelimit) {
        try {
            const { success, remaining, reset } = await ratelimit.limit(key);
            const now = Date.now();
            return {
                allowed: success,
                remaining: remaining,
                resetIn: Math.max(0, reset - now)
            };
        } catch (error) {
            console.error("Upstash RateLimit Error - Falling back to local store:", error);
        }
    }

    // B. Fallback to Local Map
    const now = Date.now();
    const entry = localStore.get(key);

    if (!entry || now > entry.resetAt) {
        localStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}
