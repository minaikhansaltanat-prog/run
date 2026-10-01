// Текст заявки для менеджера в Telegram (ТЗ 13.6).
import { LANGUAGE, METHOD, TYPE_TITLE } from "@/lib/lead-labels";
import type { LeadPayload } from "./lead-schema";

export function buildLeadMessage(d: LeadPayload): string {
  const out: string[] = [TYPE_TITLE[d.type]];
  out.push(`Имя: ${d.name}`);
  out.push(`Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`);
  out.push(`Язык сайта: ${LANGUAGE[d.locale]}`);

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
  return out.join("\n");
}
