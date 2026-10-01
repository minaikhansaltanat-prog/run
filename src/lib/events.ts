// Мини-шина событий интерфейса: открыть просмотр прайс-листа из любого места (меню, карточка, финальный блок)
export const PRICELIST_EVENT = "ruh:open-pricelist";

export function openPriceList(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PRICELIST_EVENT));
}
