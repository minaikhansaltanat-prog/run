import galleryJson from "@content/gallery.json";

export type Room = "living" | "bedroom" | "kitchen" | "bathroom" | "hall" | "office" | "restaurant" | "fitness" | "detail" | "other";

export interface GalleryItem {
  id: string;
  file: string;
  width: number;
  height: number;
  widths: number[];
  objectSlug: string | null;
  objectType: "apartment" | "commercial";
  room: Room;
  tags: string[];
  stage: "after" | "before" | "process";
  pairId: string | null;
  featured: boolean;
  order: number;
  focal: [number, number];
  lowRes: boolean;
  dominant: string;
  lqip: string;
}

export interface HeroAsset {
  file: string;
  width: number;
  height: number;
  aspect: number;
  widths: number[];
  dominant: string;
  lqip: string;
}

interface GalleryFile {
  items: GalleryItem[];
  heroes: { desktop?: HeroAsset; mobile?: HeroAsset };
}

const data = galleryJson as unknown as GalleryFile;

/** Порядок по ТЗ 14.3: сначала featured, затем по order (курируемый, не случайный) */
export const galleryItems: GalleryItem[] = [...data.items].sort((a, b) => {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return a.order - b.order;
});

export const heroes = data.heroes;

export function itemsByObject(slug: string): GalleryItem[] {
  return galleryItems.filter((i) => i.objectSlug === slug).sort((a, b) => a.order - b.order);
}

export function getItem(id: string): GalleryItem | undefined {
  return galleryItems.find((i) => i.id === id);
}
