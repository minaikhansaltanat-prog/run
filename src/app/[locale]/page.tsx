import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/Hero";
import { ServicesPanel } from "@/components/sections/ServicesPanel";
import { Works } from "@/components/sections/Works";
import { GiftSection } from "@/components/sections/GiftSection";
import { Why } from "@/components/sections/Why";
import { Process } from "@/components/sections/Process";
import { Designers } from "@/components/sections/Designers";
import { Reviews } from "@/components/sections/Reviews";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";

/**
 * Главная в порядке ТЗ раздела 5. Смета-калькулятор убран по решению клиента, на его месте только
 * золотая карточка "Подарок: прайс-лист".
 * 1 Hero, 2 Что мы делаем, 3 Наши работы, 4 Подарок (прайс-лист), 5 Почему RUH, 6 Как работаем,
 * 7 Для дизайнеров, 8 Отзывы, 9 FAQ, 10 Финальный CTA.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Hero />
      <ServicesPanel />
      <Works />
      <GiftSection />
      <Why />
      <Process />
      <Designers />
      <Reviews />
      <Faq />
      <FinalCta />
    </>
  );
}
