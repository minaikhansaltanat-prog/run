import type { MetadataRoute } from "next";
import { localeMeta, routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";
import { galleryItems } from "@/lib/gallery-data";
import { objects } from "@/lib/objects-data";
import { SITE_URL } from "@/lib/seo";

/** sitemap.xml: все страницы на обоих языках с hreflang, плюс картинки галереи (ТЗ раздел 9, 14.7) */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/gallery", "/calculator", "/privacy", ...objects.map((o) => `/objects/${o.slug}`)];
  const now = new Date();
  const out: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    const languages = Object.fromEntries(routing.locales.map((l) => [localeMeta[l].htmlLang, absoluteUrl(l, path)]));
    for (const locale of routing.locales) {
      const images =
        path === "/gallery"
          ? galleryItems.map((i) => `${SITE_URL}${i.file}-1600.jpg`)
          : path.startsWith("/objects/")
            ? galleryItems.filter((i) => `/objects/${i.objectSlug}` === path).map((i) => `${SITE_URL}${i.file}-1600.jpg`)
            : undefined;
      out.push({
        url: absoluteUrl(locale, path),
        lastModified: now,
        changeFrequency: path === "/privacy" ? "yearly" : "weekly",
        priority: path === "/" ? 1 : path === "/privacy" ? 0.2 : 0.8,
        alternates: { languages },
        ...(images ? { images } : {}),
      });
    }
  }
  return out;
}
