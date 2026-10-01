// Текст заявки для менеджера в Telegram (ТЗ 13.6). Сумму пересчитывает сервер по своему прайсу:
// значениям, пришедшим из браузера, не доверяем.
import { estimate, toPublic } from "@/lib/estimate/engine";
import { formatNumber, plain } from "@/lib/estimate/format";
import type { Pricing } from "@/lib/estimate/schema";
import { KIND_TITLE, METHOD, TYPE_TITLE, describeInput, newCalcId } from "@/lib/lead-describe";
import type { LeadPayload } from "./lead-schema";

export { describeInput, newCalcId };

export interface BuiltMessage {
  text: string;
  calcId?: string;
  priced: boolean;
}

export function buildLeadMessage(d: LeadPayload, pricing: Pricing, opts: { calcId?: string; previewAllowed?: boolean } = {}): BuiltMessage {
  const out: string[] = [];
  out.push(TYPE_TITLE[d.type]);
  if (d.type === "calc") out.push(KIND_TITLE[d.kind]);
  out.push(`Имя: ${d.name}`);
  out.push(`Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`);
  out.push(`Язык сайта: ${d.locale === "kk" ? "казахский" : "русский"}`);

  let priced = false;
  let calcId: string | undefined;
  if (d.type === "calc") {
    calcId = opts.calcId ?? newCalcId();
    out.push(`Номер расчета: ${calcId}`);
    out.push(...describeInput(d.input));
    // пересчет на сервере по собственному прайсу
    const raw = estimate(d.input, pricing);
    const pub = toPublic(raw, pricing, opts.previewAllowed ?? false);
    if (pub.status === "ok" && pub.priced) {
      priced = true;
      out.push(
        `Расчет: ${plain(formatNumber(pub.low))} - ${plain(formatNumber(pub.high))} ₸ (${plain(formatNumber(pub.perM2Low))} - ${plain(formatNumber(pub.perM2High))} ₸/м²)`,
      );
      if (pub.timeline) out.push(`Ориентировочный срок: ${pub.timeline.weeksLow}-${pub.timeline.weeksHigh} недель`);
    } else if (pub.status === "manual" && pub.reason === "other_type") {
      out.push("Расчет: нестандартное помещение, нужен ручной расчет");
    } else if (pub.status === "manual" && pub.reason === "area_range") {
      out.push("Расчет: площадь вне диапазона 20-500 м², нужен ручной расчет");
    } else {
      out.push("Расчет: цены на сайте не опубликованы (прайс не утвержден), нужен ручной расчет");
    }
    out.push(`Версия прайса: ${pricing.version}${pricing.pricingApproved ? "" : " (тестовая, не утверждена)"}`);
  }

  const a = d.attribution;
  if (a) {
    const src = [a.utm_source, a.utm_medium].filter(Boolean).join(" / ");
    out.push(`Источник: ${src || a.referrer || "прямой заход"}   Страница: ${a.page || a.landing || "/"}`);
    const rest = [
      a.utm_campaign && `campaign=${a.utm_campaign}`,
      a.utm_content && `content=${a.utm_content}`,
      a.utm_term && `term=${a.utm_term}`,
    ].filter(Boolean);
    if (rest.length) out.push(`UTM: ${rest.join(", ")}`);
  }
  return { text: out.join("\n"), calcId, priced };
}
