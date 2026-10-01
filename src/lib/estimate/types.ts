// Типы смета-калькулятора (ТЗ раздел 13). Движок не зависит от интерфейса.

export const OBJECT_TYPES = ["apartment_new", "apartment_secondary", "penthouse", "office", "restaurant", "fitness", "other"] as const;
export type ObjectType = (typeof OBJECT_TYPES)[number];

export const CONDITIONS = ["bare", "prefinish", "old"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CEILINGS = ["low", "mid", "high"] as const;
export type Ceiling = (typeof CEILINGS)[number];

export const DESIGN_PROJECT = ["yes", "progress", "no"] as const;
export type DesignProject = (typeof DESIGN_PROJECT)[number];

export const MATERIALS = ["ruh", "client"] as const;
export type MaterialsBy = (typeof MATERIALS)[number];

export const CLASSES = ["standard", "comfort", "premium"] as const;
export type FinishClass = (typeof CLASSES)[number];

export const PRESETS = ["turnkey", "rough_only", "finish_only", "refresh", "custom"] as const;
export type ScopePreset = (typeof PRESETS)[number];

export const PACKAGE_IDS = [
  "demolition",
  "rough",
  "electrical",
  "lighting",
  "plumbing",
  "tiling",
  "flooring",
  "finishing",
  "ceilings",
  "doors_trim",
  "logistics",
] as const;
export type PackageId = (typeof PACKAGE_IDS)[number];

export const HEATED = ["none", "bathrooms", "all"] as const;
export type HeatedFloor = (typeof HEATED)[number];

export const LAYOUTS = ["none", "small", "medium", "large"] as const;
export type LayoutChange = (typeof LAYOUTS)[number];

export const URGENCY = ["normal", "fast"] as const;
export type Urgency = (typeof URGENCY)[number];

export const STYLES = ["modern", "minimal", "classic", "unknown"] as const;
export type InteriorStyle = (typeof STYLES)[number];

export const BREAKDOWN_GROUPS = ["prep", "engineering", "finishing", "logistics"] as const;
export type BreakdownGroup = (typeof BREAKDOWN_GROUPS)[number];

export type ObjectGroup = "residential" | "commercial";

/** Поля, которые не влияют на цену, но попадают в заявку менеджеру */
export interface LeadExtras {
  rooms?: number;
  workstations?: number;
  meetingRooms?: boolean;
  serverRoom?: boolean;
  kitchenHood?: boolean;
  seating?: boolean;
  guestWc?: boolean;
  showers?: boolean;
  specialFloor?: boolean;
}

export interface EstimateInput {
  objectType: ObjectType;
  condition: Condition;
  area: number;
  bathrooms: number;
  ceiling: Ceiling;
  designProject: DesignProject;
  noElevator: boolean;
  urgency: Urgency;
  style: InteriorStyle;
  preset: ScopePreset;
  packages: PackageId[];
  scopeUnsure: boolean;
  heatedFloor: HeatedFloor;
  layout: LayoutChange;
  hvac: boolean;
  materials: MaterialsBy;
  finishClass: FinishClass;
  extras?: LeadExtras;
}

export type ManualReason = "other_type" | "area_range" | "pricing_not_approved";

export interface BreakdownItem {
  group: BreakdownGroup;
  /** сумма, округленная до шага, ₸ */
  amount: number;
  /** доля от общей суммы, 0..100 */
  sharePct: number;
}

export interface TimelineRange {
  weeksLow: number;
  weeksHigh: number;
}

export type EstimateResult =
  | {
      status: "ok";
      pricingVersion: string;
      objectGroup: ObjectGroup;
      /** итоговая сумма до диапазона, ₸ (не показывается клиенту как "точная") */
      total: number;
      low: number;
      high: number;
      perM2Low: number;
      perM2High: number;
      deltaPct: number;
      breakdown: BreakdownItem[];
      packages: { id: PackageId; amount: number }[];
      addOns: { id: "heated_floor" | "layout" | "hvac"; amount: number }[];
      timeline?: TimelineRange;
      warnings: string[];
    }
  | {
      status: "manual";
      reason: ManualReason;
      pricingVersion: string;
    };

/** Публичная версия: цифры есть только если прайс утвержден (или включен предпросмотр) */
export type PublicEstimate =
  (Extract<EstimateResult, { status: "ok" }> & { priced: true }) | { status: "manual"; reason: ManualReason; pricingVersion: string; priced: false };
