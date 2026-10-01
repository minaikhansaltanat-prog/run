// Страницы прайс-листа для просмотра: их собирает scripts/build-pricelist.py из PDF клиента (PDF на сайт не попадает).
import data from "@content/pricelist.json";

export interface PriceListPage {
  file: string;
  width: number;
  height: number;
}

export const priceListPages = data.pages as PriceListPage[];

/** Дата прайс-листа в виде ДД.ММ.ГГГГ (в файле хранится ГГГГ-ММ-ДД) */
export function priceListDate(): string {
  const [y, m, d] = String(data.updated ?? "").split("-");
  return y && m && d ? `${d}.${m}.${y}` : "";
}
