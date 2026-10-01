import { getTranslations } from "next-intl/server";
import { ClientMessages } from "@/components/ClientMessages";
import { GiftBanner } from "@/components/GiftBanner";

/**
 * Подарок: прайс-лист. Золотая карточка стоит между "Работами" и "Почему RUH" (по просьбе клиента).
 * Открывает то же окно, что пункт меню и ссылка в финальном блоке.
 */
export async function GiftSection() {
  const t = await getTranslations("gift");
  return (
    <section id="gift" className="gift-section bg-paper" aria-label={t("badge")}>
      <div className="container-x">
        <ClientMessages namespaces={["gift"]}>
          <GiftBanner />
        </ClientMessages>
      </div>
    </section>
  );
}
