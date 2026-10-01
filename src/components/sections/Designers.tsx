import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Photo } from "@/components/ui/Photo";
import { TrackedLink } from "@/components/TrackedLink";
import { getItem } from "@/lib/gallery-data";
import { whatsappLink } from "@config/site";

/** "Для дизайнеров и архитекторов" (ТЗ 6.7): золотая карточка на светлом фоне, кнопка пишет в WhatsApp: "у нас есть дизайн-проект" */
export async function Designers() {
  const t = await getTranslations("designers");
  const photo = getItem("ph-0006");
  const title = t("title");
  const accent = t("accent");
  const i = title.indexOf(accent);

  return (
    <section id="designers" className="section bg-paper designers" aria-labelledby="designers-title">
      <div className="container-x">
        <div className="designers__card" data-reveal>
          <div className="designers__copy">
            <h2 id="designers-title" className="h2 designers__title">
              {i >= 0 ? (
                <>
                  {title.slice(0, i)}
                  <span className="accent accent--on-gold">{accent}</span>
                  {title.slice(i + accent.length)}
                </>
              ) : (
                title
              )}
            </h2>
            <p className="designers__text">{t("text")}</p>
            <p className="designers__line">{t("line")}</p>
            <TrackedLink
              href={whatsappLink(t("whatsappText"))}
              event="click_whatsapp"
              place="designers"
              className="btn btn-dark btn-lg designers__cta"
              external
            >
              {t("cta")}
              <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </TrackedLink>
          </div>
          {photo && (
            <div className="designers__media">
              <Photo
                file={photo.file}
                widths={photo.widths}
                width={photo.width}
                height={photo.height}
                alt={t("imageAlt")}
                sizes="(max-width: 1023px) 90vw, 36vw"
                dominant={photo.dominant}
                lqip={photo.lqip}
                className="designers__img"
                objectPosition="50% 40%"
              />
              <span className="designers__shade" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
