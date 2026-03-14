import { Redis } from "@upstash/redis";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Initialized Upstash Redis client.
 * Using a singleton pattern to reuse the connection.
 */
export const redis = REDIS_URL && REDIS_TOKEN 
    ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) 
    : null;

/**
 * Cache helper for Session Metadata.
 * Used to reduce DB reads for high-frequency checks like "is this session active?".
 */
export async function getSessionCached(sessionId: string) {
    if (!redis) return null;
    const key = `session:${sessionId}`;
    return await redis.get(key);
}

export async function setSessionCache(sessionId: string, data: unknown, ttlSeconds: number = 300) {
    if (!redis) return;
    const key = `session:${sessionId}`;
    await redis.set(key, data, { ex: ttlSeconds });
}

export async function invalidateSessionCache(sessionId: string) {
    if (!redis) return;
    const key = `session:${sessionId}`;
    await redis.del(key);
}
