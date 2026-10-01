import type { Metadata } from "next";
import { localeMeta, routing, type Locale } from "@/i18n/routing";
import { STATIC_SITE } from "@/lib/site-mode";

/** Адрес сайта без слеша на конце. На GitHub Pages включает подпапку: https://имя.github.io/run */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** ru без префикса, kk с /kk (в статической сборке префикс у обоих языков и слеш на конце, как отдает GitHub Pages) */
export function localizedPath(locale: Locale, path: string): string {
  const p = path === "/" ? "" : path;
  if (STATIC_SITE) return `/${locale}${p}/`;
  return locale === routing.defaultLocale ? p || "/" : `/${locale}${p}`;
}

export function absoluteUrl(locale: Locale, path: string): string {
  return `${SITE_URL}${localizedPath(locale, path)}`;
}

export function buildMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  siteName: string;
  noindex?: boolean;
}): Metadata {
  const { locale, path, title, description, siteName } = opts;
  const url = absoluteUrl(locale, path);
  const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [localeMeta[l].htmlLang, absoluteUrl(l, path)]));
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
  const image = `${SITE_URL}/og-${locale}.jpg`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: url, languages },
    robots: opts.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      siteName,
      title,
      description,
      locale: localeMeta[locale].ogLocale,
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => localeMeta[l].ogLocale),
      images: [{ url: image, width: 1200, height: 630, alt: siteName }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
