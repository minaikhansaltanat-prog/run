import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { ClientMessages } from "@/components/ClientMessages";
import { getGalleryTiles } from "@/lib/gallery-tiles";
import { getItem, itemsByObject } from "@/lib/gallery-data";
import { objects } from "@/lib/objects-data";

/**
 * "Наши работы" (ТЗ 6.4): часть 1 "Объекты" (асимметричная сетка карточек),
 * часть 2 "Галерея" (12 лучших фото, фильтры, кнопка "Смотреть все N фото").
 * Объектов пока три и у них нет подтвержденных площади и срока: показываем только то, что есть (TODO_CLIENT).
 */
export async function Works() {
  const locale = await getLocale();
  const t = await getTranslations("works");
  const to = await getTranslations("objects");
  const tiles = await getGalleryTiles(locale);
  const tp = await getTranslations("photos");

  return (
    <section id="works" className="section works" aria-labelledby="works-title">
      <div className="container-x">
        <div className="section-head" data-reveal>
          <h2 id="works-title" className="h2">
            {t("title")}
          </h2>
          <p className="lead">{t("subtitle")}</p>
        </div>

        <h3 className="works__sub" data-reveal>
          {t("objectsTitle")}
        </h3>
        <div className="works__bento">
          {objects.map((o, idx) => {
            const cover = getItem(o.cover);
            if (!cover) return null;
            const count = itemsByObject(o.slug).length;
            return (
              <article key={o.slug} className={`work-card work-card--${idx + 1}`} data-reveal style={{ ["--i" as string]: idx }}>
                <Link href={`/objects/${o.slug}`} className="work-card__link group">
                  <span className="work-card__media">
                    <Photo
                      file={cover.file}
                      widths={cover.widths}
                      width={cover.width}
                      height={cover.height}
                      alt={tp(cover.id)}
                      sizes={idx === 0 ? "(max-width: 767px) 100vw, 52vw" : "(max-width: 767px) 100vw, 26vw"}
                      dominant={cover.dominant}
                      lqip={cover.lqip}
                      className="work-card__img"
                      objectPosition={`${Math.round(cover.focal[0] * 100)}% ${Math.round(cover.focal[1] * 100)}%`}
                    />
                    <span className="work-card__shade" aria-hidden="true" />
                    <span className="work-card__chip">{to(`${o.slug}.type`)}</span>
                    <span className="work-card__count tnum">{t("photosCount", { count })}</span>
                  </span>
                  <span className="work-card__body">
                    <span className="work-card__title">{to(`${o.slug}.title`)}</span>
                    <span className="work-card__summary">{to(`${o.slug}.summary`)}</span>
                    <span className="work-card__go">
                      {t("viewObject")}
                      <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </article>
            );
          })}

          <aside className="work-cta band-dark on-dark" data-reveal style={{ ["--i" as string]: objects.length }}>
            <h4 className="work-cta__title">{t("ctaTileTitle")}</h4>
            <p className="work-cta__text">{t("ctaTileText")}</p>
            <Link href={{ pathname: "/", hash: "calculator" }} className="btn btn-gold">
              {t("ctaTileButton")}
              <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </Link>
          </aside>
        </div>

        <h3 className="works__sub works__sub--gallery" data-reveal>
          {t("galleryTitle")}
        </h3>
        <ClientMessages namespaces={["gallery"]}>
          <GalleryGrid tiles={tiles} initial={12} mode="preview" />
        </ClientMessages>
      </div>
    </section>
  );
}
