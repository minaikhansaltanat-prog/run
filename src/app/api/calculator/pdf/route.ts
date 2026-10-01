import { z } from "zod";
import { NextResponse } from "next/server";
import { estimate, toPublic } from "@/lib/estimate/engine";
import { pricing } from "@/lib/estimate/pricing";
import { estimateInputSchema } from "@/lib/estimate/schema";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { newCalcId } from "@/lib/server/lead-message";
import { renderEstimatePdf } from "@/lib/server/estimate-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  input: estimateInputSchema,
  locale: z.enum(["ru", "kk"]),
  calcId: z
    .string()
    .regex(/^RUH-\d{6}-[0-9A-Z]{4}$/)
    .nullable()
    .optional(),
  name: z.string().trim().max(80).optional(),
});

/**
 * PDF-смета. Сумму пересчитывает сервер по собственному прайсу (значениям из браузера не доверяем).
 * Пока прайс не утвержден (и вне закрытого предпросмотра) PDF не выдается: цифр на публичном сайте нет.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`pdf:${clientIp(req.headers)}`, [
    { limit: 4, windowMs: 60_000 },
    { limit: 20, windowMs: 3_600_000 },
  ]);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });
  const { input, locale, calcId, name } = parsed.data;

  const previewAllowed = process.env.NODE_ENV !== "production" || Boolean(process.env.ALLOW_PRICING_PREVIEW);
  const raw = estimate(input, pricing);
  const pub = toPublic(raw, pricing, previewAllowed);
  if (raw.status !== "ok" || pub.status !== "ok" || !pub.priced) {
    return NextResponse.json({ ok: false, error: "not_available" }, { status: 403 });
  }

  const id = calcId ?? newCalcId();
  try {
    const pdf = await renderEstimatePdf({ input, result: raw, pricing, locale, calcId: id, clientName: name });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="RUH-Construction-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[pdf] render failed", e);
    return NextResponse.json({ ok: false, error: "render_failed" }, { status: 500 });
  }
}
