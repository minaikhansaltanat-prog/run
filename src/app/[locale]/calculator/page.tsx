import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CalculatorSection } from "@/components/sections/CalculatorSection";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({
    locale,
    path: "/calculator",
    title: t("calculatorTitle"),
    description: t("calculatorDescription"),
    siteName: t("siteName"),
  });
}

/** Отдельная страница калькулятора для рекламы и био Instagram (ТЗ раздел 5) */
export default async function CalculatorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="page-top page-top--paper">
      <CalculatorSection asPage />
    </div>
  );
}
