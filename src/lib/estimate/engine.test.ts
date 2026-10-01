import { describe, expect, it } from "vitest";
import raw from "@config/pricing.json";
import { pricingSchema, estimateInputSchema, type Pricing } from "./schema";
import {
  areaFactorFor,
  ceilToStep,
  defaultInput,
  estimate,
  estimateAllClasses,
  floorToStep,
  packagesForPreset,
  pricesVisible,
  toPublic,
} from "./engine";
import { CLASSES, OBJECT_TYPES, type EstimateInput } from "./types";

const pricing: Pricing = pricingSchema.parse(raw);
const base = (patch: Partial<EstimateInput> = {}): EstimateInput => ({ ...defaultInput(pricing), ...patch });

function ok(input: EstimateInput, p: Pricing = pricing) {
  const r = estimate(input, p);
  if (r.status !== "ok") throw new Error(`expected ok, got manual: ${r.reason}`);
  return r;
}

describe("прайс и схема", () => {
  it("сумма долей пакетов равна 100", () => {
    const sum = Object.values(pricing.packageShare).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it("битый прайс отклоняется схемой", () => {
    const broken = structuredClone(raw) as Record<string, unknown>;
    (broken.packageShare as Record<string, number>).rough = 25; // сумма станет 105
    expect(() => pricingSchema.parse(broken)).toThrow();
  });

  it("ступени площади идут по возрастанию, последняя без верхней границы", () => {
    expect(pricing.areaFactor.at(-1)?.upTo).toBeNull();
  });

  it("тестовый прайс помечен TEST_ONLY и не утвержден", () => {
    expect(pricing.marker).toBe("TEST_ONLY");
    expect(pricing.pricingApproved).toBe(false);
  });
});

describe("эталонные примеры ТЗ 13.10", () => {
  it("пример 1: новостройка 60 м², Комфорт, материалы RUH, дизайн-проект есть", () => {
    const r = ok(
      base({
        objectType: "apartment_new",
        condition: "bare",
        area: 60,
        finishClass: "comfort",
        materials: "ruh",
        ceiling: "low",
        designProject: "yes",
      }),
    );
    expect(r.total).toBe(2_700_000);
    expect(r.deltaPct).toBe(10);
    expect(r.low).toBe(2_430_000);
    expect(r.high).toBe(2_970_000);
    expect(r.perM2Low).toBe(40_500);
    expect(r.perM2High).toBe(49_500);
  });

  it("пример 2: вторичка, старый ремонт 80 м², Стандарт, без дизайн-проекта", () => {
    const r = ok(
      base({
        objectType: "apartment_secondary",
        condition: "old",
        area: 80,
        finishClass: "standard",
        materials: "ruh",
        designProject: "no",
      }),
    );
    // доля пакетов 108% (демонтаж x3), ровно 80 м² попадает в ступень "до 80" (коэффициент 1,00)
    expect(r.total).toBe(2_764_800);
    expect(r.deltaPct).toBe(15);
    expect(r.low).toBe(2_350_000);
    expect(r.high).toBe(3_180_000);
  });
});

describe("свойства расчета", () => {
  it("рост площади не уменьшает цену (внутри одной ступени коэффициента)", () => {
    const a = ok(base({ area: 45 })).total;
    const b = ok(base({ area: 60 })).total;
    const c = ok(base({ area: 80 })).total;
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    const d = ok(base({ area: 100 })).total;
    const e = ok(base({ area: 140 })).total;
    expect(e).toBeGreaterThan(d);
  });

  it("скачки areaFactor проверяются отдельно: коэффициент убывает ступенями", () => {
    expect(areaFactorFor(30, pricing)).toBe(1.1);
    expect(areaFactorFor(40, pricing)).toBe(1.1);
    expect(areaFactorFor(41, pricing)).toBe(1.0);
    expect(areaFactorFor(80, pricing)).toBe(1.0);
    expect(areaFactorFor(81, pricing)).toBe(0.97);
    expect(areaFactorFor(150, pricing)).toBe(0.97);
    expect(areaFactorFor(151, pricing)).toBe(0.94);
  });

  it("Стандарт ниже Комфорта ниже Премиума", () => {
    const all = estimateAllClasses(base(), pricing);
    const t = CLASSES.map((c) => (all[c].status === "ok" ? (all[c] as { total: number }).total : NaN));
    expect(t[0]).toBeLessThan(t[1]);
    expect(t[1]).toBeLessThan(t[2]);
  });

  it("снятие пакета уменьшает цену, добавление дополнения увеличивает", () => {
    const full = ok(base()).total;
    const noTiles = ok(base({ packages: base().packages.filter((p) => p !== "tiling"), preset: "custom" })).total;
    expect(noTiles).toBeLessThan(full);
    expect(ok(base({ heatedFloor: "bathrooms" })).total).toBeGreaterThan(full);
    expect(ok(base({ layout: "medium" })).total).toBeGreaterThan(full);
  });

  it("коммерция не дешевле квартиры при тех же параметрах", () => {
    const flat = ok(base({ objectType: "apartment_new" })).total;
    const office = ok(base({ objectType: "office" })).total;
    expect(office).toBeGreaterThanOrEqual(flat);
  });

  it("вентиляция считается только для коммерции", () => {
    const flat = ok(base({ hvac: true }));
    expect(flat.addOns.find((a) => a.id === "hvac")).toBeUndefined();
    expect(flat.warnings).toContain("hvac_commercial_only");
    const office = ok(base({ objectType: "office", hvac: true }));
    expect(office.addOns.find((a) => a.id === "hvac")).toBeDefined();
  });

  it("материалы клиента уменьшают сумму на долю материалов класса", () => {
    const ruh = ok(base({ materials: "ruh" })).total;
    const client = ok(base({ materials: "client" })).total;
    expect(client).toBeCloseTo(ruh * (1 - pricing.materialsShare.comfort), -1);
  });

  it("диапазон: нижняя граница вниз, верхняя вверх до 10 000 ₸", () => {
    const r = ok(base({ area: 73, designProject: "no", scopeUnsure: true }));
    expect(r.low % 10_000).toBe(0);
    expect(r.high % 10_000).toBe(0);
    expect(r.low).toBeLessThanOrEqual((r.total * (100 - r.deltaPct)) / 100);
    expect(r.high).toBeGreaterThanOrEqual((r.total * (100 + r.deltaPct)) / 100);
    expect(floorToStep(2_350_080, 10_000)).toBe(2_350_000);
    expect(ceilToStep(3_179_520, 10_000)).toBe(3_180_000);
    expect(floorToStep(2_430_000, 10_000)).toBe(2_430_000);
    expect(ceilToStep(2_970_000, 10_000)).toBe(2_970_000);
  });

  it("ширина диапазона ограничена сверху 25%", () => {
    const r = ok(base({ objectType: "office", designProject: "no", scopeUnsure: true }));
    expect(r.deltaPct).toBe(25); // 10 + 5 + 5 + 5 = 25
    const r2 = ok(base({ objectType: "restaurant", designProject: "no", scopeUnsure: true }), {
      ...pricing,
      range: { ...pricing.range, maxPct: 20 },
    });
    expect(r2.deltaPct).toBe(20);
  });

  it("нет NaN и отрицательных значений на допустимых входах, включая 20 и 500 м²", () => {
    const types = OBJECT_TYPES.filter((t) => t !== "other");
    for (const objectType of types) {
      for (const area of [20, 21, 40, 41, 80, 81, 150, 151, 499, 500]) {
        for (const finishClass of CLASSES) {
          for (const condition of ["bare", "prefinish", "old"] as const) {
            for (const materials of ["ruh", "client"] as const) {
              const r = ok(
                base({
                  objectType,
                  area,
                  finishClass,
                  condition,
                  materials,
                  heatedFloor: "all",
                  layout: "large",
                  hvac: true,
                  noElevator: true,
                  urgency: "fast",
                  ceiling: "high",
                }),
              );
              for (const n of [r.total, r.low, r.high, r.perM2Low, r.perM2High, ...r.breakdown.map((b) => b.amount)]) {
                expect(Number.isFinite(n)).toBe(true);
                expect(n).toBeGreaterThanOrEqual(0);
              }
              expect(r.low).toBeLessThanOrEqual(r.high);
            }
          }
        }
      }
    }
  });

  it("предчистовая отделка: черновые x0,4, демонтаж 0", () => {
    const bare = ok(base({ condition: "bare" })).total;
    const pre = ok(base({ condition: "prefinish" })).total;
    expect(pre).toBeLessThan(bare);
    const noDemolition = ok(base({ condition: "prefinish" })).packages.find((p) => p.id === "demolition");
    expect(noDemolition?.amount).toBe(0);
  });

  it("пресеты включают нужные пакеты", () => {
    expect(packagesForPreset("rough_only", pricing)).toEqual(["demolition", "rough", "electrical", "plumbing"]);
    expect(packagesForPreset("custom", pricing)).toEqual([]);
    expect(packagesForPreset("turnkey", pricing)).toHaveLength(11);
  });

  it("разбивка по разделам в сумме близка к общей сумме", () => {
    const r = ok(base({ heatedFloor: "all", layout: "small" }));
    const sum = r.breakdown.reduce((s, b) => s + b.amount, 0);
    expect(Math.abs(sum - r.total)).toBeLessThanOrEqual(10_000 * 2);
    expect(r.breakdown.reduce((s, b) => s + b.sharePct, 0)).toBeCloseTo(100, 0);
  });
});

describe("ручной режим и валидация", () => {
  it('тип "другое" ведет к заявке без цены', () => {
    const r = estimate(base({ objectType: "other" }), pricing);
    expect(r).toMatchObject({ status: "manual", reason: "other_type" });
  });

  it("площадь вне 20-500 м² ведет к ручному расчету", () => {
    expect(estimate(base({ area: 19 }), pricing)).toMatchObject({ status: "manual", reason: "area_range" });
    expect(estimate(base({ area: 501 }), pricing)).toMatchObject({ status: "manual", reason: "area_range" });
    expect(estimate(base({ area: Number.NaN }), pricing)).toMatchObject({ status: "manual", reason: "area_range" });
  });

  it("схема входа отклоняет NaN, ноль и отрицательные значения", () => {
    expect(() => estimateInputSchema.parse(base({ area: Number.NaN }))).toThrow();
    expect(() => estimateInputSchema.parse(base({ area: 0 }))).toThrow();
    expect(() => estimateInputSchema.parse(base({ area: -10 }))).toThrow();
    expect(() => estimateInputSchema.parse(base({ bathrooms: -1 }))).toThrow();
    expect(estimateInputSchema.parse(base())).toBeTruthy();
  });

  it("pricingApproved:false не возвращает цифр в публичном режиме", () => {
    const r = estimate(base(), pricing);
    const pub = toPublic(r, pricing);
    expect(pub.priced).toBe(false);
    expect(pub).toMatchObject({ status: "manual", reason: "pricing_not_approved" });
    expect(JSON.stringify(pub)).not.toMatch(/\d{6,}/); // нет шестизначных сумм
    expect(pricesVisible(pricing)).toBe(false);
  });

  it("предпросмотр показывает цифры только при явном разрешении", () => {
    const r = estimate(base(), pricing);
    expect(toPublic(r, pricing, true).priced).toBe(true);
    expect(pricesVisible(pricing, true)).toBe(true);
  });

  it("утвержденный прайс показывает цифры без предпросмотра", () => {
    const approved: Pricing = { ...pricing, pricingApproved: true };
    const pub = toPublic(estimate(base(), approved), approved);
    expect(pub.priced).toBe(true);
  });

  it("срок считается только если клиент утвердил показ", () => {
    expect(ok(base()).timeline).toBeUndefined();
    const withTimeline: Pricing = { ...pricing, showTimeline: true };
    const t = ok(base(), withTimeline).timeline;
    expect(t).toBeDefined();
    expect(t!.weeksLow).toBeLessThanOrEqual(t!.weeksHigh);
    expect(t!.weeksLow).toBeGreaterThanOrEqual(1);
  });

  it("значения по умолчанию дают цену сразу (первая цена за 3 клика)", () => {
    const r = estimate(defaultInput(pricing), pricing);
    expect(r.status).toBe("ok");
  });
});
