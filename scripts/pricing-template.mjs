// Excel-шаблон прайса для клиента (ТЗ 10.1 п.10, 13.5): npm run pricing:template  ->  pricing-template.xlsx
// Шаблон заполнен ТЕСТОВЫМИ значениями из config/pricing.json (желтые ячейки). Клиент подставляет свои расценки,
// затем `npm run pricing:import` проверяет файл и обновляет config/pricing.json (с показом различий).
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = JSON.parse(fs.readFileSync(path.join(root, "config", "pricing.json"), "utf8"));

const wb = new ExcelJS.Workbook();
wb.creator = "RUH Construction";
const GOLD = "FFFFC700";
const INPUT = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1B8" } };
const HEAD = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F0F11" } };

function sheet(name, widths) {
  const ws = wb.addWorksheet(name);
  ws.columns = widths.map((w) => ({ width: w }));
  return ws;
}
function title(ws, text, hint) {
  const r = ws.addRow([text]);
  r.font = { bold: true, size: 14 };
  if (hint) {
    const h = ws.addRow([hint]);
    h.font = { italic: true, color: { argb: "FF5B5B62" } };
  }
  ws.addRow([]);
}
function header(ws, cols) {
  const r = ws.addRow(cols);
  r.eachCell((c) => {
    c.fill = HEAD;
    c.font = { bold: true, color: { argb: GOLD } };
  });
  return r;
}
const input = (cell) => {
  cell.fill = INPUT;
  cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
};

// --- Инструкция ---
{
  const ws = sheet("Инструкция", [110]);
  title(ws, "Прайс RUH Construction для смета-калькулятора");
  [
    "1. Желтые ячейки заполняет RUH. Сейчас там ТЕСТОВЫЕ значения (для разработки): их нужно заменить на реальные.",
    "2. Расценка за м² это стоимость ремонта ПОД КЛЮЧ С МАТЕРИАЛАМИ для каждого класса отделки.",
    "3. Доли пакетов работ в сумме дают 100 (на листе 'Пакеты' есть проверка).",
    "4. Коэффициенты: 1,00 значит без изменения, 1,05 значит +5%.",
    "5. Лист 'Утверждение': пока стоит 'Нет', цифры на сайте НЕ показываются, калькулятор собирает заявки без цены.",
    "6. Срок актуальности расчета, описание классов (какие марки и категории материалов в каждом) и условия 'что входит / не входит' согласуются отдельно.",
    "7. Готовый файл отправьте разработчику: npm run pricing:import покажет различия с текущим прайсом и проверит данные.",
  ].forEach((t) => (ws.addRow([t]).getCell(1).alignment = { wrapText: true }));
}

// --- Расценки ---
{
  const ws = sheet("Расценки", [34, 18, 40]);
  title(ws, "Расценки за м² и материалы", "Класс отделки: ставка под ключ с материалами, ₸/м²");
  header(ws, ["Класс", "₸/м² под ключ", "Комментарий"]);
  for (const [k, label] of [
    ["standard", "Стандарт"],
    ["comfort", "Комфорт"],
    ["premium", "Премиум"],
  ]) {
    const r = ws.addRow([label, p.classRate[k], ""]);
    input(r.getCell(2));
    r.getCell(2).numFmt = "# ##0";
  }
  ws.addRow([]);
  header(ws, ["Доля материалов в ставке (если материалы покупает клиент, вычитается)", "Доля 0..1", ""]);
  for (const [k, label] of [
    ["standard", "Стандарт"],
    ["comfort", "Комфорт"],
    ["premium", "Премиум"],
  ]) {
    const r = ws.addRow([label, p.materialsShare[k], ""]);
    input(r.getCell(2));
    r.getCell(2).numFmt = "0.00";
  }
  ws.addRow([]);
  header(ws, ["Тип объекта", "Коэффициент", ""]);
  for (const [k, label] of [
    ["residential", "Квартира, пентхаус"],
    ["commercial", "Коммерческое помещение"],
  ]) {
    const r = ws.addRow([label, p.groupFactor[k], ""]);
    input(r.getCell(2));
    r.getCell(2).numFmt = "0.00";
  }
}

// --- Площадь ---
{
  const ws = sheet("Площадь", [30, 20, 40]);
  title(
    ws,
    "Коэффициент площади (малые площади дороже за м²)",
    "Верхняя граница включается: 'до 80' включает ровно 80. Последняя строка без границы (оставьте пустой).",
  );
  header(ws, ["До, м² (включительно)", "Коэффициент", ""]);
  for (const s of p.areaFactor) {
    const r = ws.addRow([s.upTo ?? "", s.factor, s.upTo === null ? "последняя ступень, без границы" : ""]);
    input(r.getCell(1));
    input(r.getCell(2));
  }
  ws.addRow([]);
  header(ws, ["Допустимая площадь для расчета", "м²", ""]);
  const a = ws.addRow(["Минимум", p.limits.minArea]);
  const b = ws.addRow(["Максимум", p.limits.maxArea]);
  const c = ws.addRow(["Значение по умолчанию", p.limits.defaultArea]);
  [a, b, c].forEach((r) => input(r.getCell(2)));
}

// --- Пакеты ---
{
  const ws = sheet("Пакеты", [38, 18, 60]);
  title(ws, "Доли пакетов работ, % (в сумме 100)");
  header(ws, ["Пакет", "Доля, %", "Что включает"]);
  const labels = {
    demolition: ["Демонтаж и подготовка", "Снос старых покрытий, перегородок по необходимости, вывоз мусора"],
    rough: ["Черновые работы", "Стяжка, выравнивание стен и потолков, штукатурка, грунтовка"],
    electrical: ["Электрика", "Разводка, щиток, розетки и выключатели"],
    lighting: ["Освещение", "Монтаж светильников, трековых и подвесных систем"],
    plumbing: ["Сантехника", "Разводка, установка приборов, коллектор"],
    tiling: ["Плиточные работы", "Санузлы, кухня, зоны с плиткой"],
    flooring: ["Напольные покрытия", "Паркет, ламинат, инженерная доска, кварцвинил, наливной пол"],
    finishing: ["Малярные и декоративные работы", "Покраска, обои, декоративная штукатурка"],
    ceilings: ["Потолки", "Гипсокартон, натяжные, потолочные ниши"],
    doors_trim: ["Двери и обрамление", "Монтаж дверей, плинтусы, наличники"],
    logistics: ["Логистика и уборка", "Доставка, подъем материалов, финальная уборка"],
  };
  const first = ws.rowCount + 1;
  for (const [k, v] of Object.entries(p.packageShare)) {
    const r = ws.addRow([labels[k][0], v, labels[k][1]]);
    input(r.getCell(2));
    r.getCell(4).value = k; // служебный идентификатор для импорта
  }
  const last = ws.rowCount;
  const sum = ws.addRow([
    "Сумма (должна быть 100)",
    { formula: `SUM(B${first}:B${last})` },
    { formula: `IF(ROUND(B${last + 1},4)=100,"ОК","Сумма не равна 100")` },
  ]);
  sum.font = { bold: true };
  ws.getColumn(4).hidden = true;
  ws.addRow([]);
  title(ws, "Пресеты состава работ (какие пакеты входят)", "Служебная информация: меняется только вместе с разработчиком.");
  for (const [name, list] of Object.entries(p.presets)) ws.addRow([name, "", list.join(", ")]);
}

// --- Состояние ---
{
  const ws = sheet("Состояние", [34, 18, 18]);
  title(ws, "Поправка пакетов по состоянию объекта", "Множитель доли пакета. Пусто = 1,00. Пример: при старом ремонте демонтаж x3.");
  header(ws, ["Состояние / пакет", "Множитель", ""]);
  const names = { bare: "Без отделки", prefinish: "Предчистовая от застройщика", old: "Старый ремонт, нужен демонтаж" };
  for (const [cond, mods] of Object.entries(p.conditionMod)) {
    const r = ws.addRow([names[cond]]);
    r.font = { bold: true };
    for (const [pkg, val] of Object.entries(mods)) {
      const rr = ws.addRow([`   ${pkg}`, val, `${cond}.${pkg}`]);
      input(rr.getCell(2));
    }
    if (!Object.keys(mods).length) ws.addRow(["   (без поправок)", "", ""]);
  }
  ws.getColumn(3).hidden = true;
}

// --- Коэффициенты ---
{
  const ws = sheet("Коэффициенты", [44, 18]);
  title(ws, "Коэффициенты сложности");
  header(ws, ["Параметр", "Значение"]);
  const rows = [
    ["Потолки до 2,7 м", p.ceilingFactor.low],
    ["Потолки 2,7-3,2 м", p.ceilingFactor.mid],
    ["Потолки выше 3,2 м", p.ceilingFactor.high],
    ["Этаж без грузового лифта", p.noElevatorFactor],
    ["Обычный срок", p.urgencyFactor.normal],
    ["Ускоренный срок", p.urgencyFactor.fast],
  ];
  for (const [k, v] of rows) input(ws.addRow([k, v]).getCell(2));
}

// --- Дополнения ---
{
  const ws = sheet("Дополнения", [50, 18]);
  title(ws, "Дополнения (считаются отдельно от долей)");
  header(ws, ["Параметр", "Значение"]);
  const rows = [
    ["Теплый пол: расценка, ₸/м²", p.addOns.heatedFloorRatePerM2],
    ["Теплый пол в санузлах: м² на один санузел", p.addOns.heatedFloorBathroomM2],
    ["Теплый пол во всех комнатах: доля площади (0..1)", p.addOns.heatedFloorAllShare],
    ["Перепланировка небольшая, % от базы", p.addOns.layoutPct.small],
    ["Перепланировка средняя, % от базы", p.addOns.layoutPct.medium],
    ["Перепланировка крупная, % от базы", p.addOns.layoutPct.large],
    ["Вентиляция и кондиционирование (коммерция), ₸/м²", p.addOns.hvacRatePerM2],
  ];
  for (const [k, v] of rows) input(ws.addRow([k, v]).getCell(2));
}

// --- Диапазон и срок ---
{
  const ws = sheet("Диапазон и срок", [58, 18]);
  title(ws, "Ширина диапазона, округление и срок");
  header(ws, ["Параметр", "Значение"]);
  const rows = [
    ["Базовая ширина диапазона, % (в обе стороны)", p.range.basePct],
    ["Добавка, если нет дизайн-проекта, %", p.range.noProjectPct],
    ["Добавка, если состав работ не определен, %", p.range.unsurePct],
    ["Добавка для коммерческих помещений, %", p.range.commercialPct],
    ["Максимальная ширина диапазона, %", p.range.maxPct],
    ["Шаг округления, ₸", p.roundingStep],
    ["Срок: фиксированные дни (подготовка, замеры)", p.timeline.fixedDays],
    ["Срок: рабочих дней на м² при ремонте под ключ", p.timeline.daysPerM2Turnkey],
    ["Срок: коэффициент сложности, квартира", p.timeline.complexity.residential],
    ["Срок: коэффициент сложности, коммерция", p.timeline.complexity.commercial],
    ["Срок: разброс диапазона, %", p.timeline.rangePct],
  ];
  for (const [k, v] of rows) input(ws.addRow([k, v]).getCell(2));
}

// --- Утверждение ---
{
  const ws = sheet("Утверждение", [58, 24]);
  title(ws, "Публикация цен", "ВАЖНО: пока 'Нет', на публичном сайте цифры не показываются.");
  header(ws, ["Параметр", "Значение"]);
  input(ws.addRow(["Версия прайса (например 2026-11-01)", p.version]).getCell(2));
  input(ws.addRow(["Дата обновления (ГГГГ-ММ-ДД)", p.updatedAt]).getCell(2));
  input(ws.addRow(["Цены утверждены клиентом (Да/Нет)", p.pricingApproved ? "Да" : "Нет"]).getCell(2));
  input(ws.addRow(["Показывать ориентировочный срок (Да/Нет)", p.showTimeline ? "Да" : "Нет"]).getCell(2));
}

const out = path.join(root, "pricing-template.xlsx");
await wb.xlsx.writeFile(out);
console.log("Создан", out);
