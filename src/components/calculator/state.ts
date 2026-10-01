// Состояние калькулятора: reducer, чтение и запись параметров URL (ТЗ 13.7).
// Ничего из прайса здесь нет: состав пресетов продублирован константой и сверяется тестом с config/pricing.json.
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
  type EstimateInput,
  type PackageId,
  type ScopePreset,
} from "@/lib/estimate/types";

export const PRESET_PACKAGES: Record<Exclude<ScopePreset, "custom">, PackageId[]> = {
  turnkey: ["demolition", "rough", "electrical", "lighting", "plumbing", "tiling", "flooring", "finishing", "ceilings", "doors_trim", "logistics"],
  rough_only: ["demolition", "rough", "electrical", "plumbing"],
  finish_only: ["tiling", "flooring", "finishing", "ceilings", "doors_trim", "lighting", "logistics"],
  refresh: ["finishing", "flooring", "doors_trim", "lighting", "logistics"],
};

export const DEFAULT_AREA = 60;
export const MIN_AREA = 20;
export const MAX_AREA = 500;

export function initialInput(): EstimateInput {
  return {
    objectType: "apartment_new",
    condition: "bare",
    area: DEFAULT_AREA,
    bathrooms: 1,
    ceiling: "low",
    designProject: "yes",
    noElevator: false,
    urgency: "normal",
    style: "unknown",
    preset: "turnkey",
    packages: [...PRESET_PACKAGES.turnkey],
    scopeUnsure: false,
    heatedFloor: "none",
    layout: "none",
    hvac: false,
    materials: "ruh",
    finishClass: "comfort",
  };
}

export type Action =
  | { type: "patch"; patch: Partial<EstimateInput> }
  | { type: "preset"; preset: ScopePreset }
  | { type: "togglePackage"; id: PackageId }
  | { type: "replace"; input: EstimateInput };

const sameSet = (a: PackageId[], b: PackageId[]) => a.length === b.length && a.every((x) => b.includes(x));

export function presetOf(packages: PackageId[]): ScopePreset {
  for (const k of Object.keys(PRESET_PACKAGES) as (keyof typeof PRESET_PACKAGES)[]) {
    if (sameSet(packages, PRESET_PACKAGES[k])) return k;
  }
  return "custom";
}

export function reducer(state: EstimateInput, action: Action): EstimateInput {
  switch (action.type) {
    case "replace":
      return action.input;
    case "patch": {
      const next = { ...state, ...action.patch };
      // при смене типа объекта сбрасываем то, что относится только к другому типу
      if (action.patch.objectType && action.patch.objectType !== state.objectType) {
        next.extras = undefined;
        const commercial = ["office", "restaurant", "fitness"].includes(next.objectType);
        if (!commercial) next.hvac = false;
      }
      return next;
    }
    case "preset": {
      if (action.preset === "custom") return { ...state, preset: "custom" };
      return { ...state, preset: action.preset, packages: [...PRESET_PACKAGES[action.preset]] };
    }
    case "togglePackage": {
      const has = state.packages.includes(action.id);
      const packages = has ? state.packages.filter((p) => p !== action.id) : [...state.packages, action.id];
      return { ...state, packages, preset: presetOf(packages) };
    }
  }
}

// ---------- URL ----------

const TYPE_ALIASES: Record<string, (typeof OBJECT_TYPES)[number]> = {
  apartment: "apartment_new",
  flat: "apartment_new",
  new: "apartment_new",
  secondary: "apartment_secondary",
  cafe: "restaurant",
};

const pickEnum = <T extends string>(allowed: readonly T[], v: string | null): T | undefined =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export interface ParsedParams {
  input: EstimateInput;
  step?: number;
  /** были ли в URL параметры калькулятора (нужны для предвыбора и прокрутки) */
  hasParams: boolean;
}

/** Разбор параметров URL. Любое значение проверяется по списку допустимых: из URL ничего не берем "как есть". */
export function parseParams(sp: URLSearchParams, base: EstimateInput): ParsedParams {
  const next: EstimateInput = { ...base };
  let has = false;
  const mark = <T>(v: T | undefined, apply: (x: T) => void) => {
    if (v !== undefined) {
      apply(v);
      has = true;
    }
  };

  const typeRaw = sp.get("type");
  mark(pickEnum(OBJECT_TYPES, typeRaw) ?? (typeRaw ? TYPE_ALIASES[typeRaw] : undefined), (v) => {
    next.objectType = v;
  });
  mark(pickEnum(CONDITIONS, sp.get("cond")), (v) => {
    next.condition = v;
  });
  const area = Number(sp.get("area"));
  if (sp.get("area") && Number.isFinite(area) && area > 0) {
    next.area = Math.min(MAX_AREA * 2, Math.max(1, Math.round(area)));
    has = true;
  }
  const baths = sp.get("baths");
  if (baths !== null && /^\d{1,2}$/.test(baths)) {
    next.bathrooms = Math.min(10, Number(baths));
    has = true;
  }
  mark(pickEnum(CEILINGS, sp.get("ceil")), (v) => {
    next.ceiling = v;
  });
  const project = sp.get("project");
  mark(project === "yes" || project === "progress" || project === "no" ? (project as (typeof DESIGN_PROJECT)[number]) : undefined, (v) => {
    next.designProject = v;
  });
  if (sp.get("noelev") === "1") {
    next.noElevator = true;
    has = true;
  }
  mark(pickEnum(URGENCY, sp.get("urgency")), (v) => {
    next.urgency = v;
  });
  mark(pickEnum(STYLES, sp.get("style")), (v) => {
    next.style = v;
  });
  const preset = pickEnum(PRESETS, sp.get("preset"));
  const pkg = sp.get("pkg");
  if (pkg) {
    const list = pkg.split(",").filter((p): p is PackageId => (PACKAGE_IDS as readonly string[]).includes(p));
    if (list.length) {
      next.packages = [...new Set(list)];
      next.preset = presetOf(next.packages);
      has = true;
    }
  } else if (preset) {
    next.preset = preset;
    if (preset !== "custom") next.packages = [...PRESET_PACKAGES[preset]];
    has = true;
  }
  if (sp.get("unsure") === "1") {
    next.scopeUnsure = true;
    has = true;
  }
  mark(pickEnum(HEATED, sp.get("heated")), (v) => {
    next.heatedFloor = v;
  });
  mark(pickEnum(LAYOUTS, sp.get("layout")), (v) => {
    next.layout = v;
  });
  if (sp.get("hvac") === "1") {
    next.hvac = true;
    has = true;
  }
  mark(pickEnum(MATERIALS, sp.get("mat")), (v) => {
    next.materials = v;
  });
  mark(pickEnum(CLASSES, sp.get("class")), (v) => {
    next.finishClass = v;
  });
  const stepRaw = Number(sp.get("step"));
  const step = Number.isInteger(stepRaw) && stepRaw >= 1 && stepRaw <= 5 ? stepRaw : undefined;
  return { input: next, step, hasParams: has || step !== undefined };
}

/** Параметры, которые отличаются от значений по умолчанию (короткая и читаемая ссылка) */
export function toParams(input: EstimateInput, step: number): URLSearchParams {
  const d = initialInput();
  const sp = new URLSearchParams();
  if (input.objectType !== d.objectType) sp.set("type", input.objectType);
  if (input.condition !== d.condition) sp.set("cond", input.condition);
  if (input.area !== d.area) sp.set("area", String(input.area));
  if (input.bathrooms !== d.bathrooms) sp.set("baths", String(input.bathrooms));
  if (input.ceiling !== d.ceiling) sp.set("ceil", input.ceiling);
  if (input.designProject !== d.designProject) sp.set("project", input.designProject);
  if (input.noElevator) sp.set("noelev", "1");
  if (input.urgency !== d.urgency) sp.set("urgency", input.urgency);
  if (input.style !== d.style) sp.set("style", input.style);
  if (input.preset === "custom") sp.set("pkg", input.packages.join(","));
  else if (input.preset !== d.preset) sp.set("preset", input.preset);
  if (input.scopeUnsure) sp.set("unsure", "1");
  if (input.heatedFloor !== d.heatedFloor) sp.set("heated", input.heatedFloor);
  if (input.layout !== d.layout) sp.set("layout", input.layout);
  if (input.hvac) sp.set("hvac", "1");
  if (input.materials !== d.materials) sp.set("mat", input.materials);
  if (input.finishClass !== d.finishClass) sp.set("class", input.finishClass);
  if (step > 1) sp.set("step", String(step));
  return sp;
}

export const isCommercial = (t: EstimateInput["objectType"]) => t === "office" || t === "restaurant" || t === "fitness";
export const isResidential = (t: EstimateInput["objectType"]) => t === "apartment_new" || t === "apartment_secondary" || t === "penthouse";
