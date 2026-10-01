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
  | "gallery_to_calc"
  | "gift_open"
  | "gift_submit"
  | "gift_download"
  | "calc_open"
  | "calc_start"
  | "calc_step_view"
  | "calc_preset_change"
  | "calc_result_view"
  | "calc_class_compare_click"
  | "calc_cta_pdf_click"
  | "calc_lead_submit"
  | "calc_pdf_download"
  | "calc_whatsapp_click"
  | "calc_manual_mode_shown";

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

/** Диапазоны вместо точных значений: меньше шума в отчетах и не уходят персональные данные */
export function areaBucket(area: number): string {
  if (area < 40) return "20-39";
  if (area < 60) return "40-59";
  if (area < 80) return "60-79";
  if (area < 120) return "80-119";
  if (area < 200) return "120-199";
  return "200+";
}
