// Аналитика (ТЗ раздел 9, 13.9). События складываются в dataLayer; GA4 и Meta Pixel подключаются
// только если заданы NEXT_PUBLIC_GA_ID / NEXT_PUBLIC_META_PIXEL_ID и пользователь согласился на cookies.

export type AnalyticsEvent =
  | "lead_submit"
  | "click_whatsapp"
  | "click_telegram"
  | "click_phone"
  | "view_object"
  | "gallery_open"
  | "gallery_filter"
  | "gallery_load_more"
  | "gift_open"
  | "gift_submit"
  | "gift_download";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function track(event: AnalyticsEvent, params: Record<string, string | number | boolean | undefined> = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
    if (typeof window.gtag === "function") window.gtag("event", event, params);
    if (typeof window.fbq === "function" && event === "lead_submit") window.fbq("track", "Lead");
    if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, params);
  } catch {
    /* аналитика не должна ломать интерфейс */
  }
}
