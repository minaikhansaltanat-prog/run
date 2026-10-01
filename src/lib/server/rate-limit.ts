// Ограничение частоты запросов по IP (скользящее окно, в памяти процесса).
// Для нескольких инстансов на Vercel этого достаточно как первой линии защиты от ботов;
// при росте трафика заменить на Upstash/Redis без изменения вызывающего кода.

type Bucket = number[];
const store = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface LimitRule {
  limit: number;
  windowMs: number;
}

export function rateLimit(key: string, rules: LimitRule[]): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, v] of store) if (v.length === 0 || now - v[v.length - 1] > 3_600_000) store.delete(k);
    lastSweep = now;
  }
  const bucket = (store.get(key) ?? []).filter((t) => now - t < 3_600_000);
  for (const rule of rules) {
    const hits = bucket.filter((t) => now - t < rule.windowMs);
    if (hits.length >= rule.limit) {
      const oldest = hits[0];
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000)) };
    }
  }
  bucket.push(now);
  store.set(key, bucket);
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
