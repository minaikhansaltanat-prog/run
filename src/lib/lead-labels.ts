// Подписи заявки по-русски для менеджера: общие для Telegram (серверная сборка) и сообщения в WhatsApp (GitHub Pages).
export type LeadType = "short" | "gift";
export type LeadMethod = "whatsapp" | "telegram" | "call";

export const TYPE_TITLE: Record<LeadType, string> = {
  short: "Новая заявка с сайта",
  gift: "Подарок: запрос прайс-листа",
};

export const METHOD: Record<LeadMethod, string> = { whatsapp: "WhatsApp", telegram: "Telegram", call: "Звонок" };

export const LANGUAGE: Record<"ru" | "kk", string> = { ru: "русский", kk: "казахский" };
