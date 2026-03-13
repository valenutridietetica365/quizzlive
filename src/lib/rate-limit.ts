import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Advanced Rate Limiter for Serverless Environments (Upstash Redis).
 * Fallbacks to in-memory Map for local development if environment variables are missing.
 */

// 1. Initialize Upstash Redis if env vars exist
let ratelimit: Ratelimit | null = null;

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (REDIS_URL && REDIS_TOKEN) {
    const redis = new Redis({
        url: REDIS_URL,
        token: REDIS_TOKEN,
    });

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
            const { success, limit, remaining, reset } = await ratelimit.limit(key);
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
