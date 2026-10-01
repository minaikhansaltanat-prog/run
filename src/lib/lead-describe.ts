// Описание заявки по-русски для менеджера: используется и сервером (Telegram), и статической сборкой (сообщение в WhatsApp).
// Подгружается отдельным куском только в тот момент, когда нужен текст заявки из калькулятора.
import ru from "@content/ru.json";
import type { EstimateInput } from "@/lib/estimate/types";

const L = ru.calc;
export const METHOD: Record<string, string> = { whatsapp: "WhatsApp", telegram: "Telegram", call: "Звонок" };
export const TYPE_TITLE: Record<string, string> = {
  short: "Новая заявка с сайта",
  gift: "Подарок: запрос прайс-листа",
  calc: "Новая заявка из калькулятора",
};
export const KIND_TITLE: Record<string, string> = {
  pdf: "Хочет подробную смету (PDF)",
  measure: "Просит вызвать на замеры",
  manual: "Нужен ручной расчет",
};

const yesNo = (v?: boolean) => (v ? "да" : "нет");
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function describeInput(i: EstimateInput): string[] {
  const t = (k: keyof typeof L.objectType) => lower(L.objectType[k]);
  const lines: string[] = [];
  lines.push(
    `Объект: ${t(i.objectType)}, ${lower(L.condition[i.condition])}, ${i.area} м², санузлов: ${i.bathrooms}, потолки ${lower(
      i.ceiling === "low" ? L.params.ceilingLow : i.ceiling === "mid" ? L.params.ceilingMid : L.params.ceilingHigh,
    )}`,
  );
  lines.push(`Класс: ${L.class[i.finishClass]}   Материалы: ${i.materials === "ruh" ? "закупает RUH" : "покупает клиент"}`);
  const scope = [lower(L.scope[i.preset])];
  if (i.preset === "custom") scope.push(`пакеты: ${i.packages.map((p) => lower(L.packages[p].title)).join(", ") || "не выбраны"}`);
  if (i.heatedFloor !== "none") scope.push(`теплый пол: ${i.heatedFloor === "bathrooms" ? "в санузлах" : "во всех комнатах"}`);
  if (i.layout !== "none") scope.push(`перепланировка: ${lower(L.scope[`layout${i.layout[0].toUpperCase()}${i.layout.slice(1)}` as "layoutSmall"])}`);
  if (i.hvac) scope.push("вентиляция и кондиционирование");
  if (i.scopeUnsure) scope.push("состав работ пока не определен");
  lines.push(`Состав: ${scope.join(", ")}`);
  lines.push(`Дизайн-проект: ${i.designProject === "yes" ? "есть" : i.designProject === "progress" ? "в разработке" : "нет"}`);
  const extra: string[] = [];
  if (i.noElevator) extra.push("этаж без грузового лифта");
  if (i.urgency === "fast") extra.push("ускоренный срок");
  if (i.style !== "unknown") extra.push(`стиль: ${lower(L.params[`style${i.style[0].toUpperCase()}${i.style.slice(1)}` as "styleModern"])}`);
  if (extra.length) lines.push(`Особенности: ${extra.join(", ")}`);
  const e = i.extras;
  if (e) {
    const x: string[] = [];
    if (e.rooms !== undefined) x.push(`комнат: ${e.rooms}`);
    if (e.workstations !== undefined) x.push(`рабочих мест: ${e.workstations}`);
    if (e.meetingRooms !== undefined) x.push(`переговорные: ${yesNo(e.meetingRooms)}`);
    if (e.serverRoom !== undefined) x.push(`серверная: ${yesNo(e.serverRoom)}`);
    if (e.kitchenHood !== undefined) x.push(`кухня и вытяжка: ${yesNo(e.kitchenHood)}`);
    if (e.seating !== undefined) x.push(`зона посадки: ${yesNo(e.seating)}`);
    if (e.guestWc !== undefined) x.push(`санузлы для гостей: ${yesNo(e.guestWc)}`);
    if (e.showers !== undefined) x.push(`душевые и раздевалки: ${yesNo(e.showers)}`);
    if (e.specialFloor !== undefined) x.push(`особые требования к полу: ${yesNo(e.specialFloor)}`);
    if (x.length) lines.push(`Дополнительно: ${x.join(", ")}`);
  }
  return lines;
}

export function newCalcId(now = new Date()): string {
  const d = `${now.getUTCFullYear() % 100}`.padStart(2, "0") + `${now.getUTCMonth() + 1}`.padStart(2, "0") + `${now.getUTCDate()}`.padStart(2, "0");
  const r = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `RUH-${d}-${r}`;
}
