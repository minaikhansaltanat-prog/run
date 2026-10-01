"use client";
import { useTranslations } from "next-intl";
import { DownloadSimple, Gift } from "@phosphor-icons/react";
import { openGift } from "@/lib/events";

/** Баннер "Подарок: прайс-лист" под калькулятором (по просьбе клиента) */
export function GiftBanner() {
  const t = useTranslations("gift");
  return (
    <div className="gift-banner" data-reveal>
      <span className="gift-banner__icon" aria-hidden="true">
        <Gift size={34} weight="regular" />
      </span>
      <div className="gift-banner__copy">
        <p className="gift-banner__badge">{t("badge")}</p>
        <h3 className="gift-banner__title">{t("title")}</h3>
        <p className="gift-banner__text">{t("text")}</p>
      </div>
      <button type="button" className="btn btn-dark btn-lg gift-banner__btn" onClick={openGift}>
        <DownloadSimple size={20} weight="bold" aria-hidden="true" />
        {t("button")}
      </button>
    </div>
  );
}

/** Маленькая кнопка-ссылка "Подарок" для финального блока */
export function GiftLink({ className = "" }: { className?: string }) {
  const t = useTranslations("nav");
  return (
    <button type="button" className={`gift-link ${className}`} onClick={openGift}>
      <Gift size={20} weight="regular" aria-hidden="true" />
      {t("gift")}
    </button>
  );
}
