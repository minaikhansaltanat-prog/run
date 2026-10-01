// Текст заявки для менеджера в Telegram (ТЗ 13.6). Сумму пересчитывает сервер по своему прайсу:
// значениям, пришедшим из браузера, не доверяем.
import ru from "@content/ru.json";
import { estimate, toPublic } from "@/lib/estimate/engine";
import { formatNumber, plain } from "@/lib/estimate/format";
import type { Pricing } from "@/lib/estimate/schema";
import type { EstimateInput } from "@/lib/estimate/types";
import type { LeadPayload } from "./lead-schema";

const L = ru.calc;
const METHOD: Record<string, string> = { whatsapp: "WhatsApp", telegram: "Telegram", call: "Звонок" };
const TYPE_TITLE: Record<string, string> = {
  short: "Новая заявка с сайта",
  gift: "Подарок: запрос прайс-листа",
  calc: "Новая заявка из калькулятора",
};
const KIND_TITLE: Record<string, string> = {
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

export interface BuiltMessage {
  text: string;
  calcId?: string;
  priced: boolean;
}

export function buildLeadMessage(d: LeadPayload, pricing: Pricing, opts: { calcId?: string; previewAllowed?: boolean } = {}): BuiltMessage {
  const out: string[] = [];
  out.push(TYPE_TITLE[d.type]);
  if (d.type === "calc") out.push(KIND_TITLE[d.kind]);
  out.push(`Имя: ${d.name}`);
  out.push(`Телефон: ${d.phone}   Связь: ${METHOD[d.method]}`);
  out.push(`Язык сайта: ${d.locale === "kk" ? "казахский" : "русский"}`);

  let priced = false;
  let calcId: string | undefined;
  if (d.type === "calc") {
    calcId = opts.calcId ?? newCalcId();
    out.push(`Номер расчета: ${calcId}`);
    out.push(...describeInput(d.input));
    // пересчет на сервере по собственному прайсу
    const raw = estimate(d.input, pricing);
    const pub = toPublic(raw, pricing, opts.previewAllowed ?? false);
    if (pub.status === "ok" && pub.priced) {
      priced = true;
      out.push(
        `Расчет: ${plain(formatNumber(pub.low))} - ${plain(formatNumber(pub.high))} ₸ (${plain(formatNumber(pub.perM2Low))} - ${plain(formatNumber(pub.perM2High))} ₸/м²)`,
      );
      if (pub.timeline) out.push(`Ориентировочный срок: ${pub.timeline.weeksLow}-${pub.timeline.weeksHigh} недель`);
    } else if (pub.status === "manual" && pub.reason === "other_type") {
      out.push("Расчет: нестандартное помещение, нужен ручной расчет");
    } else if (pub.status === "manual" && pub.reason === "area_range") {
      out.push("Расчет: площадь вне диапазона 20-500 м², нужен ручной расчет");
    } else {
      out.push("Расчет: цены на сайте не опубликованы (прайс не утвержден), нужен ручной расчет");
    }
    out.push(`Версия прайса: ${pricing.version}${pricing.pricingApproved ? "" : " (тестовая, не утверждена)"}`);
  }

  const a = d.attribution;
  if (a) {
    const src = [a.utm_source, a.utm_medium].filter(Boolean).join(" / ");
    out.push(`Источник: ${src || a.referrer || "прямой заход"}   Страница: ${a.page || a.landing || "/"}`);
    const rest = [
      a.utm_campaign && `campaign=${a.utm_campaign}`,
      a.utm_content && `content=${a.utm_content}`,
      a.utm_term && `term=${a.utm_term}`,
    ].filter(Boolean);
    if (rest.length) out.push(`UTM: ${rest.join(", ")}`);
  }
  return { text: out.join("\n"), calcId, priced };
}
