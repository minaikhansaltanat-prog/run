import { getTranslations } from "next-intl/server";
import { galleryItems } from "@/lib/gallery-data";
import type { GalleryTile } from "@/components/gallery/types";

/** Плитки галереи с текстами на текущем языке (alt и название объекта берутся из content/<locale>.json) */
export async function getGalleryTiles(locale: string): Promise<GalleryTile[]> {
  const tp = await getTranslations({ locale, namespace: "photos" });
  const to = await getTranslations({ locale, namespace: "objects" });
  return galleryItems.map((i) => ({
    id: i.id,
    file: i.file,
    width: i.width,
    height: i.height,
    widths: i.widths,
    room: i.room,
    objectType: i.objectType,
    objectSlug: i.objectSlug,
    objectTitle: i.objectSlug ? to(`${i.objectSlug}.title`) : null,
    calcType: i.objectType === "commercial" ? "office" : "apartment_new",
    dominant: i.dominant,
    lqip: i.lqip,
    alt: tp(i.id),
    stage: i.stage,
    pairId: i.pairId,
  }));
}
