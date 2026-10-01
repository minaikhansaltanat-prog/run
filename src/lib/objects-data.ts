import objectsJson from "@content/objects.json";

export interface ObjectItem {
  slug: string;
  type: "apartment" | "commercial";
  calcType: string;
  cover: string;
  area: number | null;
  months: number | null;
  year: number | null;
}

export const objects = objectsJson.items as ObjectItem[];

export function getObject(slug: string): ObjectItem | undefined {
  return objects.find((o) => o.slug === slug);
}
