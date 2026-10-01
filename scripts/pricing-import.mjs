// Импорт заполненного прайса: npm run pricing:import [путь к xlsx] [--write] [--allow-approved]
// По умолчанию только проверяет файл и показывает различия с config/pricing.json (ничего не меняет).
//   --write            записать результат в config/pricing.json
//   --allow-approved   разрешить запись с "Цены утверждены: Да" (защита от случайной публикации цен)
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(root, "pricing-template.xlsx"));
const write = args.includes("--write");
const allowApproved = args.includes("--allow-approved");
const cfgPath = path.join(root, "config", "pricing.json");
const current = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const errors = [];
const num = (v, label, { min = 0, max = Infinity } = {}) => {
  const n = typeof v === "object" && v !== null && "result" in v ? Number(v.result) : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) errors.push(`${label}: некорректное число "${v}"`);
  return n;
};
const cell = (ws, r, c) => ws.getRow(r).getCell(c).value;
const rowsOf = (ws) => {
  const out = [];
  ws.eachRow((row, i) => out.push({ i, v: row.values.slice(1) }));
  return out;
};

const next = structuredClone(current);

// Расценки
{
  const ws = wb.getWorksheet("Расценки");
  const rows = rowsOf(ws).filter((r) => typeof r.v[0] === "string");
  const get = (label) => rows.find((r) => r.v[0] === label);
  for (const [k, label] of [
    ["standard", "Стандарт"],
    ["comfort", "Комфорт"],
    ["premium", "Премиум"],
  ]) {
    const hits = rows.filter((r) => r.v[0] === label);
    next.classRate[k] = num(hits[0]?.v[1], `ставка ${label}`, { min: 1 });
    next.materialsShare[k] = num(hits[1]?.v[1], `доля материалов ${label}`, { min: 0, max: 0.95 });
  }
  next.groupFactor.residential = num(get("Квартира, пентхаус")?.v[1], "коэффициент квартиры", { min: 0.1 });
  next.groupFactor.commercial = num(get("Коммерческое помещение")?.v[1], "коэффициент коммерции", { min: 0.1 });
}

// Площадь
{
  const ws = wb.getWorksheet("Площадь");
  const steps = [];
  let inSteps = false;
  for (const { v } of rowsOf(ws)) {
    if (v[0] === "До, м² (включительно)") {
      inSteps = true;
      continue;
    }
    if (inSteps) {
      if (v[1] === undefined || v[1] === "" || typeof v[1] === "string") {
        if (v[0] === undefined && v[1] === undefined) break;
        if (typeof v[1] === "string" && v[1] !== "") break;
      }
      steps.push({
        upTo: v[0] === "" || v[0] === undefined || v[0] === null ? null : num(v[0], "граница площади", { min: 1 }),
        factor: num(v[1], "коэффициент площади", { min: 0.1 }),
      });
    }
    if (v[0] === "Минимум") next.limits.minArea = num(v[1], "минимальная площадь", { min: 1 });
    if (v[0] === "Максимум") next.limits.maxArea = num(v[1], "максимальная площадь", { min: 1 });
    if (v[0] === "Значение по умолчанию") next.limits.defaultArea = num(v[1], "площадь по умолчанию", { min: 1 });
  }
  if (steps.length) next.areaFactor = steps;
}

// Пакеты (идентификатор лежит в скрытой колонке D)
{
  const ws = wb.getWorksheet("Пакеты");
  ws.eachRow((row) => {
    const id = row.getCell(4).value;
    if (typeof id === "string" && id in next.packageShare)
      next.packageShare[id] = num(row.getCell(2).value, `доля пакета ${id}`, { min: 0, max: 100 });
  });
}

// Состояние (идентификатор "cond.pkg" в скрытой колонке C)
{
  const ws = wb.getWorksheet("Состояние");
  const fresh = { bare: {}, prefinish: {}, old: {} };
  ws.eachRow((row) => {
    const key = row.getCell(3).value;
    if (typeof key === "string" && key.includes(".")) {
      const [cond, pkg] = key.split(".");
      const v = row.getCell(2).value;
      if (v !== null && v !== undefined && v !== "") fresh[cond][pkg] = num(v, `множитель ${key}`, { min: 0, max: 20 });
    }
  });
  next.conditionMod = fresh;
}

// Коэффициенты
{
  const ws = wb.getWorksheet("Коэффициенты");
  const by = Object.fromEntries(rowsOf(ws).map((r) => [r.v[0], r.v[1]]));
  next.ceilingFactor.low = num(by["Потолки до 2,7 м"], "потолки до 2,7", { min: 0.5 });
  next.ceilingFactor.mid = num(by["Потолки 2,7-3,2 м"], "потолки 2,7-3,2", { min: 0.5 });
  next.ceilingFactor.high = num(by["Потолки выше 3,2 м"], "потолки выше 3,2", { min: 0.5 });
  next.noElevatorFactor = num(by["Этаж без грузового лифта"], "этаж без лифта", { min: 0.5 });
  next.urgencyFactor.normal = num(by["Обычный срок"], "обычный срок", { min: 0.5 });
  next.urgencyFactor.fast = num(by["Ускоренный срок"], "ускоренный срок", { min: 0.5 });
}

// Дополнения
{
  const ws = wb.getWorksheet("Дополнения");
  const by = Object.fromEntries(rowsOf(ws).map((r) => [r.v[0], r.v[1]]));
  next.addOns.heatedFloorRatePerM2 = num(by["Теплый пол: расценка, ₸/м²"], "теплый пол");
  next.addOns.heatedFloorBathroomM2 = num(by["Теплый пол в санузлах: м² на один санузел"], "теплый пол, санузел");
  next.addOns.heatedFloorAllShare = num(by["Теплый пол во всех комнатах: доля площади (0..1)"], "теплый пол, доля", { max: 1 });
  next.addOns.layoutPct.small = num(by["Перепланировка небольшая, % от базы"], "перепланировка небольшая");
  next.addOns.layoutPct.medium = num(by["Перепланировка средняя, % от базы"], "перепланировка средняя");
  next.addOns.layoutPct.large = num(by["Перепланировка крупная, % от базы"], "перепланировка крупная");
  next.addOns.hvacRatePerM2 = num(by["Вентиляция и кондиционирование (коммерция), ₸/м²"], "вентиляция");
}

// Диапазон и срок
{
  const ws = wb.getWorksheet("Диапазон и срок");
  const by = Object.fromEntries(rowsOf(ws).map((r) => [r.v[0], r.v[1]]));
  next.range.basePct = num(by["Базовая ширина диапазона, % (в обе стороны)"], "базовая ширина", { max: 60 });
  next.range.noProjectPct = num(by["Добавка, если нет дизайн-проекта, %"], "добавка без проекта");
  next.range.unsurePct = num(by["Добавка, если состав работ не определен, %"], "добавка неопределенность");
  next.range.commercialPct = num(by["Добавка для коммерческих помещений, %"], "добавка коммерция");
  next.range.maxPct = num(by["Максимальная ширина диапазона, %"], "максимальная ширина", { max: 60 });
  next.roundingStep = num(by["Шаг округления, ₸"], "шаг округления", { min: 1 });
  next.timeline.fixedDays = num(by["Срок: фиксированные дни (подготовка, замеры)"], "срок, дни");
  next.timeline.daysPerM2Turnkey = num(by["Срок: рабочих дней на м² при ремонте под ключ"], "срок, дней на м²", { min: 0.01 });
  next.timeline.complexity.residential = num(by["Срок: коэффициент сложности, квартира"], "сложность, квартира", { min: 0.1 });
  next.timeline.complexity.commercial = num(by["Срок: коэффициент сложности, коммерция"], "сложность, коммерция", { min: 0.1 });
  next.timeline.rangePct = num(by["Срок: разброс диапазона, %"], "разброс срока", { max: 100 });
}

// Утверждение
{
  const ws = wb.getWorksheet("Утверждение");
  const by = Object.fromEntries(rowsOf(ws).map((r) => [r.v[0], r.v[1]]));
  next.version = String(by["Версия прайса (например 2026-11-01)"] ?? "").trim();
  next.updatedAt = String(
    by["Дата обновления (ГГГГ-ММ-ДД)"] instanceof Date
      ? by["Дата обновления (ГГГГ-ММ-ДД)"].toISOString().slice(0, 10)
      : (by["Дата обновления (ГГГГ-ММ-ДД)"] ?? ""),
  ).trim();
  next.pricingApproved = String(by["Цены утверждены клиентом (Да/Нет)"]).trim().toLowerCase() === "да";
  next.showTimeline = String(by["Показывать ориентировочный срок (Да/Нет)"]).trim().toLowerCase() === "да";
  if (!next.version) errors.push("Утверждение: не указана версия прайса");
  if (next.pricingApproved) {
    next.marker = "APPROVED";
    next.note = "Прайс утвержден клиентом. Изменения только через pricing-template.xlsx и npm run pricing:import.";
  }
}

const sum = Object.values(next.packageShare).reduce((a, b) => a + b, 0);
if (Math.abs(sum - 100) > 1e-6) errors.push(`Сумма долей пакетов ${sum}, должна быть 100`);
if (next.limits.minArea >= next.limits.maxArea) errors.push("Минимальная площадь должна быть меньше максимальной");

// различия
const flat = (o, pre = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flat(v, `${pre}${k}.`) : [[`${pre}${k}`, JSON.stringify(v)]],
  );
const a = new Map(flat(current));
const b = new Map(flat(next));
const diffs = [...new Set([...a.keys(), ...b.keys()])].filter((k) => a.get(k) !== b.get(k));
console.log(`Файл: ${file}`);
if (diffs.length) {
  console.log(`\nИзменения (${diffs.length}):`);
  for (const k of diffs) console.log(`  ${k}: ${a.get(k)} -> ${b.get(k)}`);
} else console.log("\nРазличий с config/pricing.json нет.");

if (errors.length) {
  console.error("\nОШИБКИ в файле, прайс не обновлен:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
if (next.pricingApproved && write && !allowApproved) {
  console.error("\nВ файле стоит 'Цены утверждены: Да'. Это опубликует цифры на сайте. Для записи добавьте --allow-approved.");
  process.exit(2);
}
if (write) {
  fs.writeFileSync(cfgPath, JSON.stringify(next, null, 2) + "\n");
  console.log("\nconfig/pricing.json обновлен. Дальше: npm test (проверка схемы и эталонов), затем npm run build.");
} else {
  console.log("\nПроверка пройдена. Чтобы применить, добавьте --write.");
}
