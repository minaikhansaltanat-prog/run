// Мини-шина событий интерфейса: открыть окно подарка из любого места (меню, баннер, финальный блок)
export const GIFT_EVENT = "ruh:open-gift";

export function openGift(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(GIFT_EVENT));
}
