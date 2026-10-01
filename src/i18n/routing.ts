import { defineRouting } from "next-intl/routing";
import { STATIC_SITE } from "@/lib/site-mode";

// Русский по умолчанию (без префикса), казахский на /kk. Английский добавляется позже:
// достаточно дописать "en" в locales, создать content/en.json и добавить строку в localeMeta.
// В статической сборке (GitHub Pages) нет proxy, который подставляет язык, поэтому префикс есть у обоих: /ru и /kk.
export const routing = defineRouting({
  locales: ["ru", "kk"],
  defaultLocale: "ru",
  localePrefix: STATIC_SITE ? "always" : "as-needed",
});

export type Locale = (typeof routing.locales)[number];

export const localeMeta: Record<Locale, { label: string; htmlLang: string; ogLocale: string; numberLocale: string }> = {
  ru: { label: "RU", htmlLang: "ru", ogLocale: "ru_KZ", numberLocale: "ru-RU" },
  kk: { label: "KK", htmlLang: "kk", ogLocale: "kk_KZ", numberLocale: "kk-KZ" },
};
