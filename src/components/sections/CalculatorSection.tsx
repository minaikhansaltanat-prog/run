import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { CalculatorLoader } from "@/components/calculator/CalculatorLoader";
import { ClientMessages } from "@/components/ClientMessages";
import { GiftBanner } from "@/components/GiftBanner";
import { pricing } from "@/lib/estimate/pricing";
import { getGalleryTiles } from "@/lib/gallery-tiles";

/**
 * Блок "Смета-калькулятор" (ТЗ 6.9, 13). Главный лид-механизм.
 * Прайс уходит в браузер только если он утвержден клиентом (pricingApproved) или включен закрытый предпросмотр.
 * Пока прайс не утвержден, калькулятор работает в режиме сбора параметров и цифр не показывает.
 */
export async function CalculatorSection({ asPage = false }: { asPage?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("calc");
  const allowPreview = process.env.NODE_ENV !== "production" || Boolean(process.env.ALLOW_PRICING_PREVIEW);
  const passPricing = pricing.pricingApproved || allowPreview ? pricing : null;
  const tiles = (await getGalleryTiles(locale)).filter((x) => x.objectType === "apartment").slice(0, 3);
  const Heading = asPage ? "h1" : "h2";

  return (
    <section id="calculator" className="section bg-paper calc-section" aria-labelledby="calc-title">
      <div className="container-x">
        <div className="section-head" data-reveal>
          <span className="towers" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Heading id="calc-title" className="h2">
            {t("title")}
          </Heading>
          <p className="lead">{t("subtitle")}</p>
        </div>

        <ClientMessages namespaces={["calc", "cta", "common", "gift"]}>
          <div className="calc-wrap" data-reveal style={{ ["--i" as string]: 1 }}>
            <Suspense fallback={<div className="calc-skeleton" aria-busy="true" />}>
              <CalculatorLoader pricing={passPricing} allowPreview={allowPreview} similar={tiles} level={asPage ? 2 : 3} />
            </Suspense>
          </div>

          <div className="calc-gift">
            <GiftBanner />
          </div>
        </ClientMessages>
      </div>
    </section>
  );
}
