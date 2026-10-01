"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, localeMeta } from "@/i18n/routing";

/** Переключатель RU | KK. На телефоне стоит сразу слева от кнопки-гармошки. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t("language")}>
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          scroll={false}
          prefetch={false}
          hrefLang={localeMeta[l].htmlLang}
          lang={localeMeta[l].htmlLang}
          aria-current={l === locale ? "true" : undefined}
          className="lang-switch__item"
          data-active={l === locale ? "true" : "false"}
        >
          {localeMeta[l].label}
        </Link>
      ))}
    </div>
  );
}
