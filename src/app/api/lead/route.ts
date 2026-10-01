import { NextResponse } from "next/server";
import { pricing } from "@/lib/estimate/pricing";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { leadSchema } from "@/lib/server/lead-schema";
import { buildLeadMessage } from "@/lib/server/lead-message";
import { sendTelegram } from "@/lib/server/telegram";
import { gift } from "@config/site";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Режим предпросмотра цен разрешен только вне production или по явной переменной окружения */
function previewAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || Boolean(process.env.ALLOW_PRICING_PREVIEW);
}

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
    return json({ ok: true, id: null });
  }

  // 4. сообщение менеджеру (сумма пересчитывается здесь, значениям из браузера не доверяем)
  const message = buildLeadMessage(data, pricing, { previewAllowed: previewAllowed() });
  const sent = await sendTelegram(message.text);
  if (!sent.ok) {
    return json({ ok: false, error: sent.error ?? "send_failed" }, 503);
  }

  const giftFileReady = gift.available && existsSync(path.join(process.cwd(), "public", gift.file));
  return json({
    ok: true,
    id: message.calcId ?? null,
    priced: message.priced,
    gift: data.type === "gift" ? { available: giftFileReady, file: giftFileReady ? gift.file : null } : undefined,
  });
}
