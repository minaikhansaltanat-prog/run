import { z } from "zod";
import {
  CEILINGS,
  CLASSES,
  CONDITIONS,
  DESIGN_PROJECT,
  HEATED,
  LAYOUTS,
  MATERIALS,
  OBJECT_TYPES,
  PACKAGE_IDS,
  PRESETS,
  STYLES,
  URGENCY,
} from "./types";

/** Схема прайса (config/pricing.json). Проверяется при сборке: битый прайс не должен попасть на сайт. */
export const pricingSchema = z
  .object({
    marker: z.string(),
    version: z.string().min(1),
    updatedAt: z.string().min(1),
    pricingApproved: z.boolean(),
    showTimeline: z.boolean(),
    note: z.string().optional(),
    limits: z.object({
      minArea: z.number().positive(),
      maxArea: z.number().positive(),
      defaultArea: z.number().positive(),
    }),
    classRate: z.record(z.enum(CLASSES), z.number().positive()),
    groupFactor: z.record(z.enum(["residential", "commercial"]), z.number().positive()),
    areaFactor: z.array(z.object({ upTo: z.number().positive().nullable(), factor: z.number().positive() })).min(1),
    packageShare: z.record(z.enum(PACKAGE_IDS), z.number().min(0)),
    conditionMod: z.record(z.enum(CONDITIONS), z.partialRecord(z.enum(PACKAGE_IDS), z.number().min(0))),
    presets: z.object({
      turnkey: z.array(z.enum(PACKAGE_IDS)),
      rough_only: z.array(z.enum(PACKAGE_IDS)),
      finish_only: z.array(z.enum(PACKAGE_IDS)),
      refresh: z.array(z.enum(PACKAGE_IDS)),
    }),
    ceilingFactor: z.record(z.enum(CEILINGS), z.number().positive()),
    noElevatorFactor: z.number().positive(),
    urgencyFactor: z.record(z.enum(URGENCY), z.number().positive()),
    materialsShare: z.record(z.enum(CLASSES), z.number().min(0).max(0.95)),
    addOns: z.object({
      heatedFloorRatePerM2: z.number().min(0),
      heatedFloorBathroomM2: z.number().min(0),
      heatedFloorAllShare: z.number().min(0).max(1),
      layoutPct: z.object({ small: z.number().min(0), medium: z.number().min(0), large: z.number().min(0) }),
      hvacRatePerM2: z.number().min(0),
    }),
    range: z.object({
      basePct: z.number().min(0),
      noProjectPct: z.number().min(0),
      unsurePct: z.number().min(0),
      commercialPct: z.number().min(0),
      maxPct: z.number().min(0).max(60),
    }),
    roundingStep: z.number().positive(),
    timeline: z.object({
      fixedDays: z.number().min(0),
      daysPerM2Turnkey: z.number().positive(),
      complexity: z.record(z.enum(["residential", "commercial"]), z.number().positive()),
      rangePct: z.number().min(0).max(100),
    }),
  })
  .superRefine((p, ctx) => {
    const sum = Object.values(p.packageShare).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 1e-6) {
      ctx.addIssue({ code: "custom", message: `Сумма долей пакетов должна быть 100, сейчас ${sum}`, path: ["packageShare"] });
    }
    const last = p.areaFactor[p.areaFactor.length - 1];
    if (last.upTo !== null) {
      ctx.addIssue({ code: "custom", message: "Последняя ступень areaFactor должна иметь upTo: null", path: ["areaFactor"] });
    }
    for (let i = 1; i < p.areaFactor.length - 1; i++) {
      const prev = p.areaFactor[i - 1].upTo;
      const cur = p.areaFactor[i].upTo;
      if (prev !== null && cur !== null && cur <= prev) {
        ctx.addIssue({ code: "custom", message: "Ступени areaFactor должны идти по возрастанию", path: ["areaFactor", i] });
      }
    }
    if (p.limits.minArea >= p.limits.maxArea) {
      ctx.addIssue({ code: "custom", message: "minArea должен быть меньше maxArea", path: ["limits"] });
    }
  });

export type Pricing = z.infer<typeof pricingSchema>;

const extrasSchema = z
  .object({
    rooms: z.number().int().min(0).max(50),
    workstations: z.number().int().min(0).max(2000),
    meetingRooms: z.boolean(),
    serverRoom: z.boolean(),
    kitchenHood: z.boolean(),
    seating: z.boolean(),
    guestWc: z.boolean(),
    showers: z.boolean(),
    specialFloor: z.boolean(),
  })
  .partial();

/** Схема входных данных: используется и в браузере, и на сервере (сервер пересчитывает сам) */
export const estimateInputSchema = z.object({
  objectType: z.enum(OBJECT_TYPES),
  condition: z.enum(CONDITIONS),
  area: z.number().finite().positive().max(1_000_000),
  bathrooms: z.number().int().min(0).max(20),
  ceiling: z.enum(CEILINGS),
  designProject: z.enum(DESIGN_PROJECT),
  noElevator: z.boolean(),
  urgency: z.enum(URGENCY),
  style: z.enum(STYLES),
  preset: z.enum(PRESETS),
  packages: z.array(z.enum(PACKAGE_IDS)).max(PACKAGE_IDS.length),
  scopeUnsure: z.boolean(),
  heatedFloor: z.enum(HEATED),
  layout: z.enum(LAYOUTS),
  hvac: z.boolean(),
  materials: z.enum(MATERIALS),
  finishClass: z.enum(CLASSES),
  extras: extrasSchema.optional(),
});
