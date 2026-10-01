import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { ClientMessages } from "@/components/ClientMessages";
import { TrackView } from "@/components/TrackView";
import { Photo } from "@/components/ui/Photo";
import { getGalleryTiles } from "@/lib/gallery-tiles";
import { getItem } from "@/lib/gallery-data";
import { getObject, objects } from "@/lib/objects-data";
import { buildMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => objects.map((o) => ({ locale, slug: o.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !getObject(slug)) return {};
  const t = await getTranslations({ locale, namespace: "objects" });
  const m = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({
    locale,
    path: `/objects/${slug}`,
    title: `${t(`${slug}.title`)} | ${m("siteName")}`,
    description: t(`${slug}.summary`),
    siteName: m("siteName"),
  });
}

/** Страница объекта (кейс, ТЗ 6.11). Площадь, срок и год показываются только после подтверждения клиентом (TODO_CLIENT). */
export default async function ObjectPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const obj = getObject(slug);
  if (!obj) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("objectPage");
  const to = await getTranslations("objects");
  const tp = await getTranslations("photos");
  const tw = await getTranslations("works");
  const tiles = (await getGalleryTiles(locale)).filter((x) => x.objectSlug === slug);
  const others = objects.filter((o) => o.slug !== slug);

  const specs: { k: string; v: string }[] = [];
  if (obj.area) specs.push({ k: t("area"), v: t("areaValue", { value: obj.area }) });
  if (obj.months) specs.push({ k: t("term"), v: t("monthsValue", { count: obj.months }) });
  if (obj.year) specs.push({ k: t("year"), v: String(obj.year) });

  return (
    <div className="page-top">
      <TrackView event="view_object" params={{ slug }} />
      <article className="section object-page">
        <div className="container-x">
          <Link href={{ pathname: "/", hash: "works" }} className="link-arrow object-page__back">
            <ArrowLeft size={16} weight="bold" aria-hidden="true" />
            {t("back")}
          </Link>
          <div className="section-head object-page__head">
            <p className="object-page__type">{to(`${slug}.type`)}</p>
            <h1 className="h2 page-title">{to(`${slug}.title`)}</h1>
            <p className="lead">{to(`${slug}.summary`)}</p>
            {specs.length > 0 && (
              <dl className="object-page__specs">
                {specs.map((s) => (
                  <div key={s.k}>
                    <dt>{s.k}</dt>
                    <dd>{s.v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <h2 className="visually-hidden">{t("photos")}</h2>
          <ClientMessages namespaces={["gallery"]}>
            <GalleryGrid tiles={tiles} initial={24} mode="object" />
          </ClientMessages>

          <aside className="object-page__cta band-dark on-dark">
            <div>
              <h2 className="h3">{t("wantSame")}</h2>
              <p className="lead">{t("wantSameText")}</p>
            </div>
            <Link href={{ pathname: "/", query: { type: obj.calcType }, hash: "calculator" }} className="btn btn-gold btn-lg">
              {tw("ctaTileButton")}
              <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </Link>
          </aside>

          {others.length > 0 && (
            <div className="object-page__more">
              <h2 className="works__sub">{t("moreObjects")}</h2>
              <ul className="object-page__list" role="list">
                {others.map((o) => {
                  const cover = getItem(o.cover);
                  if (!cover) return null;
                  return (
                    <li key={o.slug}>
                      <Link href={`/objects/${o.slug}`} className="work-card__link group">
                        <span className="work-card__media object-page__thumb">
                          <Photo
                            file={cover.file}
                            widths={cover.widths}
                            width={cover.width}
                            height={cover.height}
                            alt={tp(cover.id)}
                            sizes="(max-width: 767px) 100vw, 33vw"
                            dominant={cover.dominant}
                            lqip={cover.lqip}
                            className="work-card__img"
                          />
                        </span>
                        <span className="work-card__body">
                          <span className="work-card__title">{to(`${o.slug}.title`)}</span>
                          <span className="work-card__summary">{to(`${o.slug}.summary`)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
