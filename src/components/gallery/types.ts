import type { Room } from "@/lib/gallery-data";

/** Данные плитки галереи, подготовленные на сервере (тексты уже на нужном языке) */
export interface GalleryTile {
  id: string;
  file: string;
  width: number;
  height: number;
  widths: number[];
  room: Room;
  objectType: "apartment" | "commercial";
  objectSlug: string | null;
  objectTitle: string | null;
  dominant: string;
  lqip: string;
  alt: string;
  stage: "after" | "before" | "process";
  pairId: string | null;
}
