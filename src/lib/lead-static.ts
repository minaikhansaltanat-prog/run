// Статическая сборка (GitHub Pages) не имеет сервера, поэтому заявка уходит готовым сообщением в WhatsApp компании.
// Токен Telegram-бота в браузер выдавать нельзя, а значит прямой отправки без сервера нет: клиент сам нажимает "Отправить".
// Текст по-русски, как в Telegram-версии: менеджер читает одинаковый формат.
import type { EstimateInput } from "@/lib/estimate/types";
import type { Attribution } from "@/lib/attribution";
import { whatsappLink } from "@config/site";

export interface StaticLead {
  type: "short" | "gift" | "calc";
  name: string;
  phone: string;
  method: "whatsapp" | "telegram" | "call";
  locale: "ru" | "kk";
  calc?: { kind: "pdf" | "measure" | "manual"; input: EstimateInput };
  attribution: Attribution & { page: string };
}

const TITLE: Record<StaticLead["type"], string> = {
  short: "Новая заявка с сайта",
  gift: "Подарок: запрос прайс-листа",
  calc: "Новая заявка из калькулятора",
};
const METHOD: Record<StaticLead["method"], string> = { whatsapp: "WhatsApp", telegram: "Telegram", call: "Звонок" };

export interface StaticLeadMessage {
  text: string;
  url: string;
  calcId: string | null;
}

export async function buildStaticLead(d: StaticLead): Promise<StaticLeadMessage> {
  const out: string[] = [TITLE[d.type]];
  let calcId: string | null = null;
  if (d.type === "calc" && d.calc) {
    // тяжелый кусок (русские подписи параметров) грузится только для заявок из калькулятора
    const { describeInput, newCalcId, KIND_TITLE } = await import("@/lib/lead-describe");
    calcId = newCalcId();
    out.push(KIND_TITLE[d.calc.kind]);
    out.push(`Имя: ${d.name}`, `Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`);
    out.push(`Язык сайта: ${d.locale === "kk" ? "казахский" : "русский"}`);
    out.push(`Номер расчета: ${calcId}`);
    out.push(...describeInput(d.calc.input));
    out.push("Расчет: цены на сайте не опубликованы, нужен ручной расчет");
  } else {
    out.push(`Имя: ${d.name}`, `Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`);
    out.push(`Язык сайта: ${d.locale === "kk" ? "казахский" : "русский"}`);
  }
  const a = d.attribution;
  const src = [a.utm_source, a.utm_medium].filter(Boolean).join(" / ");
  out.push(`Источник: ${src || a.referrer || "прямой заход"}   Страница: ${a.page || a.landing || "/"}`);
  const text = out.join("\n");
  return { text, url: whatsappLink(text), calcId };
}
