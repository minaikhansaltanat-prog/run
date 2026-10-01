// Статическая сборка (GitHub Pages) не имеет сервера, поэтому заявка уходит готовым сообщением в WhatsApp компании.
// Токен Telegram-бота в браузер выдавать нельзя, а значит прямой отправки без сервера нет: клиент сам нажимает "Отправить".
// Текст по-русски, как в Telegram-версии: менеджер читает одинаковый формат.
import type { Attribution } from "@/lib/attribution";
import { LANGUAGE, METHOD, TYPE_TITLE, type LeadMethod, type LeadType } from "@/lib/lead-labels";
import { whatsappLink } from "@config/site";

export interface StaticLead {
  type: LeadType;
  name: string;
  phone: string;
  method: LeadMethod;
  locale: "ru" | "kk";
  attribution: Attribution & { page: string };
}

export interface StaticLeadMessage {
  text: string;
  url: string;
}

export function buildStaticLead(d: StaticLead): StaticLeadMessage {
  const a = d.attribution;
  const src = [a.utm_source, a.utm_medium].filter(Boolean).join(" / ");
  const text = [
    TYPE_TITLE[d.type],
    `Имя: ${d.name}`,
    `Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`,
    `Язык сайта: ${LANGUAGE[d.locale]}`,
    `Источник: ${src || a.referrer || "прямой заход"}   Страница: ${a.page || a.landing || "/"}`,
  ].join("\n");
  return { text, url: whatsappLink(text) };
}
