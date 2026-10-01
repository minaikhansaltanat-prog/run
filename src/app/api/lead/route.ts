import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { leadSchema } from "@/lib/server/lead-schema";
import { buildLeadMessage } from "@/lib/server/lead-message";
import { sendTelegram } from "@/lib/server/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request) {
  // 1. ограничение частоты
  const ip = clientIp(req.headers);
  const rl = rateLimit(`lead:${ip}`, [
    { limit: 3, windowMs: 60_000 },
    { limit: 12, windowMs: 3_600_000 },
  ]);
  if (!rl.ok) return json({ ok: false, error: "rate_limited" }, 429, { "Retry-After": String(rl.retryAfterSec) });

  // 2. разбор и валидация
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "bad_json" }, 400);
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => String(i.path[0] ?? "form"));
    return json({ ok: false, error: "validation", fields: [...new Set(fields)] }, 422);
  }
  const data = parsed.data;

  // 3. ловушки для ботов: honeypot и слишком быстрая отправка. Бот получает "успех" и ничего не отправляется.
  if ((data.hp && data.hp.length > 0) || (data.elapsedMs !== undefined && data.elapsedMs < 1200)) {
    return json({ ok: true });
  }

  // 4. сообщение менеджеру
  const sent = await sendTelegram(buildLeadMessage(data));
  if (!sent.ok) {
    return json({ ok: false, error: sent.error ?? "send_failed" }, 503);
  }

  return json({ ok: true });
}
