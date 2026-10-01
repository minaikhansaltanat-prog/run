// Движок расчета сметы (ТЗ 13.4). Чистый модуль: без React, без обращения к DOM и сети.
// Вход: EstimateInput + Pricing. Выход: диапазон, разбивка, срок, предупреждения.
import type { Pricing } from "./schema";
import {
  CLASSES,
  type BreakdownGroup,
  type BreakdownItem,
  type EstimateInput,
  type EstimateResult,
  type FinishClass,
  type ObjectGroup,
  type ObjectType,
  type PackageId,
  type PublicEstimate,
  type ScopePreset,
} from "./types";

/** Группировка пакетов для экрана результата (ТЗ 13.4) */
export const PACKAGE_GROUP: Record<PackageId, BreakdownGroup> = {
  demolition: "prep",
  rough: "prep",
  electrical: "engineering",
  lighting: "engineering",
  plumbing: "engineering",
  tiling: "finishing",
  flooring: "finishing",
  finishing: "finishing",
  ceilings: "finishing",
  doors_trim: "finishing",
  logistics: "logistics",
};

export function objectGroupOf(type: ObjectType): ObjectGroup | null {
  switch (type) {
    case "apartment_new":
    case "apartment_secondary":
    case "penthouse":
      return "residential";
    case "office":
    case "restaurant":
    case "fitness":
      return "commercial";
    default:
      return null; // "other": считаем вручную
  }
}

/** Пакеты, которые включает пресет (для "custom" возвращает пустой список: решает пользователь) */
export function packagesForPreset(preset: ScopePreset, pricing: Pricing): PackageId[] {
  if (preset === "custom") return [];
  return [...pricing.presets[preset]];
}

/** Ступенчатый коэффициент площади: границы включают верхнюю ("до 80" включает ровно 80) */
export function areaFactorFor(area: number, pricing: Pricing): number {
  for (const step of pricing.areaFactor) {
    if (step.upTo === null || area <= step.upTo) return step.factor;
  }
  return pricing.areaFactor[pricing.areaFactor.length - 1].factor;
}

/** Убирает хвост плавающей арифметики (…0000000005) перед округлением до шага */
const clean = (n: number) => Math.round(n * 1e4) / 1e4;
export const floorToStep = (n: number, step: number) => Math.floor(clean(n) / step + 1e-9) * step;
export const ceilToStep = (n: number, step: number) => Math.ceil(clean(n) / step - 1e-9) * step;

/** Доля состава работ с учетом состояния объекта (в процентах от базы, 100 = полный комплекс) */
export function scopeSharePct(input: Pick<EstimateInput, "packages" | "condition">, pricing: Pricing): number {
  const mods = pricing.conditionMod[input.condition];
  const unique = [...new Set(input.packages)];
  return unique.reduce((sum, id) => sum + pricing.packageShare[id] * (mods[id] ?? 1), 0);
}

export function estimate(input: EstimateInput, pricing: Pricing): EstimateResult {
  const pricingVersion = pricing.version;
  const group = objectGroupOf(input.objectType);

  if (group === null) return { status: "manual", reason: "other_type", pricingVersion };
  if (!Number.isFinite(input.area) || input.area < pricing.limits.minArea || input.area > pricing.limits.maxArea) {
    return { status: "manual", reason: "area_range", pricingVersion };
  }

  const area = input.area;
  const rate = pricing.classRate[input.finishClass];
  const areaFactor = areaFactorFor(area, pricing);
  const groupFactor = pricing.groupFactor[group];
  const multipliers = pricing.ceilingFactor[input.ceiling] * (input.noElevator ? pricing.noElevatorFactor : 1) * pricing.urgencyFactor[input.urgency];
  const materialsFactor = input.materials === "client" ? 1 - pricing.materialsShare[input.finishClass] : 1;

  const perUnit = area * rate * groupFactor * areaFactor * multipliers * materialsFactor;

  const mods = pricing.conditionMod[input.condition];
  const unique = [...new Set(input.packages)];
  const packages = unique.map((id) => ({
    id,
    amount: perUnit * ((pricing.packageShare[id] * (mods[id] ?? 1)) / 100),
  }));
  const basePrice = packages.reduce((s, p) => s + p.amount, 0);

  // дополнения: считаются отдельно, не входят в долю состава работ
  const addOns: { id: "heated_floor" | "layout" | "hvac"; amount: number }[] = [];
  if (input.heatedFloor !== "none") {
    const heatedArea =
      input.heatedFloor === "bathrooms"
        ? Math.min(area, input.bathrooms * pricing.addOns.heatedFloorBathroomM2)
        : area * pricing.addOns.heatedFloorAllShare;
    addOns.push({ id: "heated_floor", amount: heatedArea * pricing.addOns.heatedFloorRatePerM2 });
  }
  if (input.layout !== "none") {
    addOns.push({ id: "layout", amount: (basePrice * pricing.addOns.layoutPct[input.layout]) / 100 });
  }
  if (input.hvac && group === "commercial") {
    addOns.push({ id: "hvac", amount: area * pricing.addOns.hvacRatePerM2 });
  }

  const total = basePrice + addOns.reduce((s, a) => s + a.amount, 0);

  // ширина диапазона (целые проценты: арифметика без накопления ошибок)
  let delta = pricing.range.basePct;
  if (input.designProject !== "yes") delta += pricing.range.noProjectPct;
  if (input.scopeUnsure) delta += pricing.range.unsurePct;
  if (group === "commercial") delta += pricing.range.commercialPct;
  delta = Math.min(delta, pricing.range.maxPct);

  const step = pricing.roundingStep;
  const low = floorToStep((total * (100 - delta)) / 100, step);
  const high = ceilToStep((total * (100 + delta)) / 100, step);

  // разбивка по разделам
  const sums: Record<BreakdownGroup, number> = { prep: 0, engineering: 0, finishing: 0, logistics: 0 };
  for (const p of packages) sums[PACKAGE_GROUP[p.id]] += p.amount;
  for (const a of addOns) {
    if (a.id === "layout") sums.prep += a.amount;
    else sums.engineering += a.amount;
  }
  const groups: BreakdownGroup[] = ["prep", "engineering", "finishing", "logistics"];
  const breakdown: BreakdownItem[] = groups
    .filter((g) => sums[g] > 0)
    .map((g) => ({
      group: g,
      amount: Math.round(sums[g] / step) * step,
      sharePct: total > 0 ? Math.round((sums[g] / total) * 1000) / 10 : 0,
    }));

  const warnings: string[] = [];
  if (unique.length === 0) warnings.push("no_packages");
  if (input.hvac && group !== "commercial") warnings.push("hvac_commercial_only");

  let timeline;
  if (pricing.showTimeline) {
    const shareFactor = scopeSharePct(input, pricing) / 100;
    const days = (pricing.timeline.fixedDays + area * pricing.timeline.daysPerM2Turnkey * shareFactor) * pricing.timeline.complexity[group];
    const weeks = Math.ceil(days / 5);
    timeline = {
      weeksLow: Math.max(1, Math.round((weeks * (100 - pricing.timeline.rangePct)) / 100)),
      weeksHigh: Math.ceil((weeks * (100 + pricing.timeline.rangePct)) / 100),
    };
  }

  const perM2 = (n: number) => Math.round(n / area / 100) * 100;

  return {
    status: "ok",
    pricingVersion,
    objectGroup: group,
    total: Math.round(total),
    low,
    high,
    perM2Low: perM2(low),
    perM2High: perM2(high),
    deltaPct: delta,
    breakdown,
    packages: packages.map((p) => ({ id: p.id, amount: Math.round(p.amount) })),
    addOns: addOns.map((a) => ({ id: a.id, amount: Math.round(a.amount) })),
    timeline,
    warnings,
  };
}

/** Расчет по всем трем классам (карточки сравнения на экране результата) */
export function estimateAllClasses(input: EstimateInput, pricing: Pricing): Record<FinishClass, EstimateResult> {
  return Object.fromEntries(CLASSES.map((c) => [c, estimate({ ...input, finishClass: c }, pricing)])) as Record<FinishClass, EstimateResult>;
}

/**
 * Публичный режим (ТЗ 13.5, критическое правило): пока pricingApproved=false, цифры наружу не отдаются.
 * previewAllowed включает просмотр тестовых цен только для разработки или закрытого preview.
 */
export function toPublic(result: EstimateResult, pricing: Pricing, previewAllowed = false): PublicEstimate {
  if (result.status === "manual") return { ...result, priced: false };
  if (!pricing.pricingApproved && !previewAllowed) {
    return { status: "manual", reason: "pricing_not_approved", pricingVersion: result.pricingVersion, priced: false };
  }
  return { ...result, priced: true };
}

export function pricesVisible(pricing: Pricing, previewAllowed = false): boolean {
  return pricing.pricingApproved || previewAllowed;
}

/** Значения по умолчанию: первая цена видна уже после выбора типа объекта и 2-3 кликов (ТЗ 13.1, 13.2) */
export function defaultInput(pricing: Pricing): EstimateInput {
  return {
    objectType: "apartment_new",
    condition: "bare",
    area: pricing.limits.defaultArea,
    bathrooms: 1,
    ceiling: "low",
    designProject: "yes",
    noElevator: false,
    urgency: "normal",
    style: "unknown",
    preset: "turnkey",
    packages: packagesForPreset("turnkey", pricing),
    scopeUnsure: false,
    heatedFloor: "none",
    layout: "none",
    hvac: false,
    materials: "ruh",
    finishClass: "comfort",
  };
}
