export const RATE_LIMIT_WINDOW = 60 * 1000;
export const MAX_REQUESTS = 30;

const rateLimitMap = new Map<string, { count: number; expires: number }>();

export function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (now > record.expires) {
        rateLimitMap.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (record.count >= MAX_REQUESTS) {
        return true;
    }

    record.count++;
    return false;
}
