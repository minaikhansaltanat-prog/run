"use client";
import { useTranslations } from "next-intl";
import { ArrowRight, Phone } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { site } from "@config/site";

/**
 * Нижняя липкая панель на телефоне (ТЗ раздел 5): Позвонить и Рассчитать.
 * WhatsApp и Telegram вынесены в плавающую кнопку справа (она стоит над панелью).
 */
export function MobileBar() {
  const t = useTranslations("bar");
  return (
    <div className="mobile-bar" role="region" aria-label={t("label")}>
      <a className="btn btn-outline mobile-bar__call" href={site.phone.tel} onClick={() => track("click_phone", { place: "bar" })}>
        <Phone size={20} weight="regular" aria-hidden="true" />
        {t("call")}
      </a>
      <Link href={{ pathname: "/", hash: "calculator" }} className="btn btn-gold mobile-bar__calc">
        {t("calc")}
        <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
      </Link>
    </div>
  );
}
