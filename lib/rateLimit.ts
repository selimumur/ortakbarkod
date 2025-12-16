
// Basic production-ready Rate Limiter using a Map (In-Memory).
// Note: In serverless (Vercel), this memory is not shared across lambda instances.
// For strict global rate limiting, use Redis (Upstash) or Vercel KV.
// This implementation provides "Per-Instance" protection which is better than nothing against basic spam.

interface RateLimitContext {
    tokens: number;
    lastRefill: number;
}

const rateLimitMap = new Map<string, RateLimitContext>();

export function rateLimit(
    ip: string,
    limit: number = 10,
    windowMs: number = 10000
): boolean {
    const now = Date.now();
    const cleanupWindow = 60000; // Cleanup text every minute

    // Auto cleanup (simple garbage collection)
    if (Math.random() < 0.01) {
        // 1% chance to clean up old entries to prevent memory leak
        for (const [key, val] of rateLimitMap.entries()) {
            if (now - val.lastRefill > windowMs * 2) {
                rateLimitMap.delete(key);
            }
        }
    }

    const record = rateLimitMap.get(ip) || { tokens: limit, lastRefill: now };

    const timePassed = now - record.lastRefill;
    const tokensToAdd = Math.floor(timePassed / (windowMs / limit)); // Simple refill logic

    if (tokensToAdd > 0) {
        record.tokens = Math.min(limit, record.tokens + tokensToAdd);
        record.lastRefill = now;
    }

    if (record.tokens > 0) {
        record.tokens--;
        rateLimitMap.set(ip, record);
        return true; // Allowed
    } else {
        rateLimitMap.set(ip, record);
        return false; // Blocked
    }
}
