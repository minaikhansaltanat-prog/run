import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/privacy", title: t("privacyTitle"), description: t("privacyDescription"), siteName: t("siteName") });
}

const SECTIONS = ["general", "data", "purpose", "transfer", "storage", "rights", "cookies", "contacts"] as const;

/**
 * Политика конфиденциальности (ТЗ раздел 9).
 * Шаблон: перед публикацией проверить юристом; реквизиты оператора (ТОО/ИП, БИН) добавить после ответа клиента (TODO_CLIENT).
 */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  return (
    <div className="page-top">
      <article className="section legal">
        <div className="container-x">
          <div className="legal__wrap">
            <h1 className="h2 page-title">{t("title")}</h1>
            <p className="legal__updated">{t("updated")}</p>
            {SECTIONS.map((s) => (
              <section key={s} className="legal__section">
                <h2 className="legal__h">{t(`sections.${s}.title`)}</h2>
                <p>{t(`sections.${s}.text`)}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
