import { getTranslations } from "next-intl/server";
import { ArrowRight, Buildings, Hammer, House, Package, PencilRuler } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

const ITEMS = [
  { key: "apartments", Icon: House },
  { key: "commercial", Icon: Buildings },
  { key: "project", Icon: PencilRuler },
  { key: "supply", Icon: Package },
  { key: "construction", Icon: Hammer },
] as const;

/** Белая панель, наезжающая на нижний край hero (ТЗ 6.3). Ссылка в карточке ведет к форме заявки. */
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
            {ITEMS.map(({ key, Icon }) => (
              <li key={key} className="services__item group">
                <div className="services__inner">
                  <span className="icon-plate" aria-hidden="true">
                    <Icon size={26} weight="regular" />
                  </span>
                  <h3 className="services__name">{t(`items.${key}.title`)}</h3>
                  <p className="services__text">{t(`items.${key}.text`)}</p>
                  <Link href={{ pathname: "/", hash: "contacts" }} className="link-arrow services__link">
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
