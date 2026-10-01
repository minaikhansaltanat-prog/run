import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { ClientMessages } from "@/components/ClientMessages";
import { getGalleryTiles } from "@/lib/gallery-tiles";
import { absoluteUrl, buildMetadata, SITE_URL } from "@/lib/seo";
import { galleryItems, largestUrl } from "@/lib/gallery-data";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({ locale, path: "/gallery", title: t("galleryTitle"), description: t("galleryDescription"), siteName: t("siteName") });
}

/** /gallery (ТЗ раздел 14): все фото, прошедшие контроль качества, 24 на страницу и "Показать еще" */
export default async function GalleryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("gallery");
  const tp = await getTranslations("photos");
  const tiles = await getGalleryTiles(locale);

  const ld = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: t("title"),
    url: absoluteUrl(locale, "/gallery"),
    image: galleryItems.map((i) => ({
      "@type": "ImageObject",
      contentUrl: `${SITE_URL}${largestUrl(i)}`,
      name: tp(i.id),
      width: i.width,
      height: i.height,
    })),
  };

  return (
    <div className="page-top">
      <section className="section gallery-page">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <div className="container-x">
          <div className="section-head">
            <h1 className="h2 page-title">{t("title")}</h1>
            <p className="lead">{t("subtitle")}</p>
            <p className="gallery-page__intro">{t("intro")}</p>
          </div>
          <div className="gallery-page__grid">
            <ClientMessages namespaces={["gallery"]}>
              <GalleryGrid tiles={tiles} initial={24} pageSize={24} mode="page" />
            </ClientMessages>
          </div>
        </div>
      </section>
    </div>
  );
}
