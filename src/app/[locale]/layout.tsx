import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, localeMeta, type Locale } from "@/i18n/routing";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { pick } from "@/lib/pick";
import { site } from "@config/site";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileBar } from "@/components/MobileBar";
import { FloatingContactLazy } from "@/components/FloatingContactLazy";
import { GiftDialogHost } from "@/components/GiftDialogHost";
import { ConsentBanner } from "@/components/ConsentBanner";
import { ClientMessages } from "@/components/ClientMessages";
import { AttributionCapture } from "@/components/AttributionCapture";
import { RevealObserver } from "@/components/ui/Reveal";
import "../globals.css";

// Шрифты самохостные (src/fonts), подмножества собраны scripts/build-fonts.py, казахские буквы проверены (docs/font-glyph-check.md)
const onest = localFont({
  src: [{ path: "../../fonts/onest.woff2", weight: "400 700", style: "normal" }],
  variable: "--font-onest",
  display: "block", // шрифты малы и предзагружены: короткая невидимость текста вместо двойной раскладки при подмене
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

const playfair = localFont({
  src: [
    { path: "../../fonts/playfair-display.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/playfair-display-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "block", // шрифты малы и предзагружены: короткая невидимость текста вместо двойной раскладки при подмене
  adjustFontFallback: "Times New Roman",
  fallback: ["Times New Roman", "Georgia", "serif"],
});

// Базовые разделы текстов для компонентов шапки, нижней панели и плавающей кнопки.
// Остальное (калькулятор, галерея, подарок, отзывы) передается точечно рядом с компонентом (ClientMessages).
const BASE_NAMESPACES = ["common", "nav", "floating", "bar", "consentBanner", "footer"] as const;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F0F11",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    ...buildMetadata({ locale, path: "/", title: t("title"), description: t("description"), siteName: t("siteName") }),
    manifest: "/manifest.webmanifest",
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "common" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    name: site.name,
    url: SITE_URL,
    image: `${SITE_URL}/og-${locale}.jpg`,
    logo: `${SITE_URL}/brand/logo-light.png`,
    telephone: site.phone.e164,
    address: {
      "@type": "PostalAddress",
      streetAddress: "проспект Достык, 40",
      addressLocality: "Алматы",
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    areaServed: { "@type": "City", name: "Алматы" },
    sameAs: [site.instagram, site.tiktok, site.facebook, site.telegram],
    // рейтинг и число оценок совпадают с источником (2ГИС, на 01.10.2026)
    aggregateRating: { "@type": "AggregateRating", ratingValue: site.rating.value.toFixed(1), ratingCount: site.rating.count },
  };

  return (
    <html lang={localeMeta[locale as Locale].htmlLang} className={`${onest.variable} ${playfair.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a className="skip-link" href="#main">
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={pick(messages as Record<string, unknown>, BASE_NAMESPACES)}>
          <RevealObserver />
          <AttributionCapture />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <MobileBar />
          <FloatingContactLazy />
          <ClientMessages namespaces={["gift", "cta"]}>
            <GiftDialogHost />
          </ClientMessages>
          {process.env.NEXT_PUBLIC_GA_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID ? <ConsentBanner /> : null}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
