/**
 * Small in-memory rate limiter for login attempts.
 *
 * Caveat: serverless runs many isolated instances, so this bounds attempts
 * per instance rather than globally. It is enough to stop a naive password
 * spray from one machine; a determined attacker spread across instances needs
 * a shared store (Supabase table / Upstash) or Supabase Auth's own limits.
 */

type Bucket = { count: number; firstAttempt: number; blockedUntil: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;   // attempts are counted over 15 minutes
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 15 * 60 * 1000;    // then the key is locked out for 15 minutes
const MAX_KEYS = 5000;              // hard cap so the map cannot grow unbounded

function sweep(now: number) {
    for (const [key, bucket] of buckets) {
        const expired = now - bucket.firstAttempt > WINDOW_MS && now > bucket.blockedUntil;
        if (expired) buckets.delete(key);
    }
    // Still oversized (many distinct keys inside one window): drop the oldest.
    if (buckets.size > MAX_KEYS) {
        const oldest = [...buckets.entries()]
            .sort((a, b) => a[1].firstAttempt - b[1].firstAttempt)
            .slice(0, buckets.size - MAX_KEYS);
        for (const [key] of oldest) buckets.delete(key);
    }
}

/** Call before checking credentials. Returns how long to wait, if blocked. */
export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    sweep(now);

    const bucket = buckets.get(key);

    if (!bucket) {
        buckets.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 });
        return { allowed: true, retryAfterSeconds: 0 };
    }

    if (now < bucket.blockedUntil) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000) };
    }

    // Window elapsed - start counting again.
    if (now - bucket.firstAttempt > WINDOW_MS) {
        bucket.count = 1;
        bucket.firstAttempt = now;
        bucket.blockedUntil = 0;
        return { allowed: true, retryAfterSeconds: 0 };
    }

    bucket.count++;

    if (bucket.count > MAX_ATTEMPTS) {
        bucket.blockedUntil = now + BLOCK_MS;
        return { allowed: false, retryAfterSeconds: Math.ceil(BLOCK_MS / 1000) };
    }

    return { allowed: true, retryAfterSeconds: 0 };
}

/** Call after a successful login so a legitimate admin is not penalised. */
export function clearRateLimit(key: string) {
    buckets.delete(key);
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}
