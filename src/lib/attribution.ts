"use client";
// UTM-метки и страница-источник добавляются в каждую заявку (ТЗ раздел 9).
// Метки запоминаются на сессию: клиент мог прийти из Instagram на главную, а оставить заявку на /calculator.

const KEY = "ruh_attr";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing?: string;
}

function safeGet(): Attribution {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

/** Вызывать один раз при загрузке страницы */
export function captureAttribution(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const current = safeGet();
    const next: Attribution = { ...current };
    let changed = false;
    for (const f of FIELDS) {
      const v = params.get(f);
      if (v) {
        next[f] = v.slice(0, 120);
        changed = true;
      }
    }
    if (!next.landing) {
      next.landing = window.location.pathname;
      changed = true;
    }
    if (!next.referrer && document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.host !== window.location.host) {
          next.referrer = ref.host;
          changed = true;
        }
      } catch {
        /* пустой referrer */
      }
    }
    if (changed) window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sessionStorage может быть недоступен: интерфейс работает без него */
  }
}

export function getAttribution(): Attribution & { page: string } {
  return { ...safeGet(), page: typeof window !== "undefined" ? window.location.pathname + window.location.search : "" };
}
