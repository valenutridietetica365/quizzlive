/**
 * Simple in-memory rate limiter for API routes.
 * Limits requests per user per window (default: 10 requests per minute).
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        Array.from(store.entries()).forEach(([key, entry]) => {
            if (now > entry.resetAt) store.delete(key);
        });
    }, 5 * 60 * 1000);
}

export function checkRateLimit(
    userId: string,
    route: string,
    maxRequests: number = 10,
    windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
    const key = `${userId}:${route}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetAt - now };
}
