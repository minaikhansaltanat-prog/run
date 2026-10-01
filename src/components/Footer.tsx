import { getTranslations } from "next-intl/server";
import { FacebookLogo, InstagramLogo, MapPin, Phone, TelegramLogo, TiktokLogo, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { MapFacade } from "@/components/MapFacade";
import { TrackedLink } from "@/components/TrackedLink";
import { asset } from "@/lib/site-mode";
import { site, whatsappLink } from "@config/site";
import { FooterCta } from "@/components/FooterCta";

/**
 * Футер (ТЗ 7.4, 6.12): 4 колонки (о компании, навигация, услуги, контакты), без формы рассылки,
 * вместо нее золотая кнопка "Оставить заявку". Ссылок не больше 12.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const ts = await getTranslations("services");
  const tf = await getTranslations("floating");
  const year = new Date().getFullYear();
  const nav = ["services", "works", "calculator", "reviews"] as const;
  const services = ["apartments", "commercial", "project", "supply", "construction"] as const;

  return (
    <footer className="footer band-dark on-dark">
      <div className="container-x footer__grid">
        <div className="footer__about">
          <img
            src={asset("/brand/seal-320.webp")}
            srcSet={`${asset("/brand/seal-320.webp")} 1x, ${asset("/brand/seal-640.webp")} 2x`}
            width="148"
            height="148"
            alt="RUH Construction"
            className="footer__seal"
            loading="lazy"
            decoding="async"
          />
          <p className="footer__about-text">{t("about")}</p>
          <ul className="footer__social" role="list">
            <li>
              <a href={site.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${t("instagram")} ${site.instagramHandle}`}>
                <InstagramLogo size={22} weight="regular" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href={site.tiktok} target="_blank" rel="noopener noreferrer" aria-label={`${t("tiktok")} ${site.instagramHandle}`}>
                <TiktokLogo size={22} weight="regular" aria-hidden="true" />
              </a>
            </li>
            <li>
              <a href={site.facebook} target="_blank" rel="noopener noreferrer" aria-label={t("facebook")}>
                <FacebookLogo size={22} weight="regular" aria-hidden="true" />
              </a>
            </li>
          </ul>
        </div>

        <nav className="footer__col" aria-label={t("navTitle")}>
          <h2 className="footer__title">{t("navTitle")}</h2>
          <ul role="list">
            {nav.map((k) => (
              <li key={k}>
                <Link href={{ pathname: "/", hash: k }} className="footer__link">
                  {tn(k)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__col">
          <h2 className="footer__title">{t("servicesTitle")}</h2>
          <ul role="list" className="footer__plain">
            {services.map((k) => (
              <li key={k}>{ts(`items.${k}.title`)}</li>
            ))}
          </ul>
        </div>

        <div className="footer__col footer__contacts">
          <h2 className="footer__title">{t("contactsTitle")}</h2>
          <address className="footer__address">
            <MapPin size={20} weight="regular" aria-hidden="true" />
            <span>{t("address")}</span>
          </address>
          <ul role="list" className="footer__list">
            <li>
              <TrackedLink href={site.phone.tel} event="click_phone" place="footer" className="footer__link footer__phone tnum">
                <Phone size={20} weight="regular" aria-hidden="true" />
                {site.phone.display}
              </TrackedLink>
            </li>
            <li>
              <TrackedLink href={whatsappLink(tf("whatsappText"))} event="click_whatsapp" place="footer" className="footer__link" external>
                <WhatsappLogo size={20} weight="regular" aria-hidden="true" />
                WhatsApp
              </TrackedLink>
            </li>
            <li>
              <TrackedLink href={site.telegram} event="click_telegram" place="footer" className="footer__link" external>
                <TelegramLogo size={20} weight="regular" aria-hidden="true" />
                {site.telegramHandle}
              </TrackedLink>
            </li>
            <li>
              <a href={site.twoGis} className="footer__link" target="_blank" rel="noopener noreferrer">
                <MapPin size={20} weight="regular" aria-hidden="true" />
                {t("twoGis")}
              </a>
            </li>
          </ul>
          <MapFacade />
        </div>
      </div>

      <div className="container-x footer__bottom">
        <p>{t("rights", { year })}</p>
        <Link href="/privacy" className="footer__link footer__privacy">
          {t("privacy")}
        </Link>
        <FooterCta label={t("ctaButton")} />
      </div>
    </footer>
  );
}
