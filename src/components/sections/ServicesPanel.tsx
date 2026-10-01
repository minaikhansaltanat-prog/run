import { getTranslations } from "next-intl/server";
import { ArrowRight, Buildings, Hammer, House, Package, PencilRuler } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

type Query = Record<string, string>;

// Ссылка "Рассчитать" ведет в калькулятор с предвыбором (ТЗ 6.3):
// Квартиры и Комплектация -> тип "квартира", Коммерция -> "офис", Реализация проекта -> дизайн-проект есть
const ITEMS = [
  { key: "apartments", Icon: House, query: { type: "apartment_new" } as Query },
  { key: "commercial", Icon: Buildings, query: { type: "office" } as Query },
  { key: "project", Icon: PencilRuler, query: { project: "yes" } as Query },
  { key: "supply", Icon: Package, query: { type: "apartment_new" } as Query },
  { key: "construction", Icon: Hammer, query: { preset: "turnkey" } as Query },
] as const;

/** Белая панель, наезжающая на нижний край hero (ТЗ 6.3) */
export async function ServicesPanel() {
  const t = await getTranslations("services");
  return (
    <section id="services" className="services" aria-labelledby="services-title">
      <div className="container-x">
        <div className="panel services__panel">
          <h2 id="services-title" className="services__title h3">
            {t("title")}
          </h2>
          <ul className="services__grid" role="list">
            {ITEMS.map(({ key, Icon, query }) => (
              <li key={key} className="services__item group">
                <div className="services__inner">
                  <span className="icon-plate" aria-hidden="true">
                    <Icon size={26} weight="regular" />
                  </span>
                  <h3 className="services__name">{t(`items.${key}.title`)}</h3>
                  <p className="services__text">{t(`items.${key}.text`)}</p>
                  <Link href={{ pathname: "/", query, hash: "calculator" }} className="link-arrow services__link">
                    {t("linkLabel")}
                    <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
