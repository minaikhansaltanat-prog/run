"use client";
import { useState, type Dispatch } from "react";
import { useTranslations } from "next-intl";
import {
  Barbell,
  BuildingApartment,
  Briefcase,
  Crown,
  DotsThreeOutline,
  ForkKnife,
  Hammer,
  House,
  PaintRoller,
  Wall,
  CaretDown,
} from "@phosphor-icons/react";
import { AreaField, OptionCard, Segmented, Stepper, Switch } from "./controls";
import { isCommercial, isResidential, MAX_AREA, MIN_AREA, type Action } from "./state";
import { CLASSES, OBJECT_TYPES, PACKAGE_IDS, PRESETS, type EstimateInput, type FinishClass, type ObjectType } from "@/lib/estimate/types";

interface StepProps {
  input: EstimateInput;
  dispatch: Dispatch<Action>;
}

const TYPE_ICON: Record<ObjectType, React.ReactNode> = {
  apartment_new: <BuildingApartment size={28} weight="regular" />,
  apartment_secondary: <House size={28} weight="regular" />,
  penthouse: <Crown size={28} weight="regular" />,
  office: <Briefcase size={28} weight="regular" />,
  restaurant: <ForkKnife size={28} weight="regular" />,
  fitness: <Barbell size={28} weight="regular" />,
  other: <DotsThreeOutline size={28} weight="regular" />,
};

/** Шаг 1: что ремонтируем и в каком состоянии */
export function Step1({ input, dispatch }: StepProps) {
  const t = useTranslations("calc");
  return (
    <div className="calc-step">
      <fieldset className="calc-group">
        <legend className="field-label">{t("objectType.label")}</legend>
        <div className="opt-grid opt-grid--types">
          {OBJECT_TYPES.map((ty) => (
            <OptionCard
              key={ty}
              name="objectType"
              value={ty}
              checked={input.objectType === ty}
              onChange={(v) => dispatch({ type: "patch", patch: { objectType: v as ObjectType } })}
              icon={TYPE_ICON[ty]}
              title={t(`objectType.${ty}`)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="calc-group">
        <legend className="field-label">{t("condition.label")}</legend>
        <div className="opt-grid opt-grid--cond">
          {(["bare", "prefinish", "old"] as const).map((c) => (
            <OptionCard
              key={c}
              name="condition"
              value={c}
              checked={input.condition === c}
              onChange={(v) => dispatch({ type: "patch", patch: { condition: v as EstimateInput["condition"] } })}
              icon={c === "bare" ? <Wall size={26} /> : c === "prefinish" ? <PaintRoller size={26} /> : <Hammer size={26} />}
              title={t(`condition.${c}`)}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/** Шаг 2: размер и особенности */
export function Step2({ input, dispatch }: StepProps) {
  const t = useTranslations("calc");
  const p = (patch: Partial<EstimateInput>) => dispatch({ type: "patch", patch });
  const extras = input.extras ?? {};
  const setExtra = (patch: NonNullable<EstimateInput["extras"]>) => p({ extras: { ...extras, ...patch } });
  const advancedUsed = input.noElevator || input.urgency !== "normal" || input.style !== "unknown";
  const [open, setOpen] = useState(advancedUsed);
  const outOfRange = input.area < MIN_AREA || input.area > MAX_AREA;

  return (
    <div className="calc-step">
      <AreaField
        label={t("params.area")}
        hint={t("params.areaHint")}
        value={input.area}
        onChange={(v) => p({ area: v })}
        error={outOfRange && input.area > 0 ? t("manual.areaOutOfRange") : null}
      />

      <div className="calc-row">
        <Stepper label={t("params.bathrooms")} value={input.bathrooms} min={0} max={10} onChange={(v) => p({ bathrooms: v })} />
        {isResidential(input.objectType) && (
          <Stepper label={t("params.rooms")} value={extras.rooms ?? 2} min={1} max={12} onChange={(v) => setExtra({ rooms: v })} />
        )}
        {input.objectType === "office" && (
          <Stepper
            label={t("params.workstations")}
            value={extras.workstations ?? 10}
            min={1}
            max={500}
            onChange={(v) => setExtra({ workstations: v })}
          />
        )}
      </div>

      <Segmented
        name="ceiling"
        label={t("params.ceiling")}
        value={input.ceiling}
        onChange={(v) => p({ ceiling: v })}
        options={[
          { value: "low", label: t("params.ceilingLow") },
          { value: "mid", label: t("params.ceilingMid") },
          { value: "high", label: t("params.ceilingHigh") },
        ]}
      />

      <Segmented
        name="designProject"
        label={t("params.designProject")}
        value={input.designProject}
        onChange={(v) => p({ designProject: v })}
        options={[
          { value: "yes", label: t("params.projectYes") },
          { value: "progress", label: t("params.projectProgress") },
          { value: "no", label: t("params.projectNo") },
        ]}
      />

      {/* поля, нужные только для некоторых типов (идут в заявку, на цену не влияют) */}
      {input.objectType === "office" && (
        <div className="calc-switches">
          <Switch label={t("params.meetingRooms")} checked={Boolean(extras.meetingRooms)} onChange={(v) => setExtra({ meetingRooms: v })} />
          <Switch label={t("params.serverRoom")} checked={Boolean(extras.serverRoom)} onChange={(v) => setExtra({ serverRoom: v })} />
        </div>
      )}
      {input.objectType === "restaurant" && (
        <div className="calc-switches">
          <Switch label={t("params.kitchenHood")} checked={Boolean(extras.kitchenHood)} onChange={(v) => setExtra({ kitchenHood: v })} />
          <Switch label={t("params.seating")} checked={Boolean(extras.seating)} onChange={(v) => setExtra({ seating: v })} />
          <Switch label={t("params.guestWc")} checked={Boolean(extras.guestWc)} onChange={(v) => setExtra({ guestWc: v })} />
        </div>
      )}
      {input.objectType === "fitness" && (
        <div className="calc-switches">
          <Switch label={t("params.showers")} checked={Boolean(extras.showers)} onChange={(v) => setExtra({ showers: v })} />
          <Switch label={t("params.specialFloor")} checked={Boolean(extras.specialFloor)} onChange={(v) => setExtra({ specialFloor: v })} />
        </div>
      )}

      <div className="calc-advanced">
        <button type="button" className="calc-advanced__toggle" aria-expanded={open} aria-controls="calc-advanced" onClick={() => setOpen((v) => !v)}>
          {t("params.advanced")}
          <CaretDown size={18} weight="bold" aria-hidden="true" />
        </button>
        {open && (
          <div id="calc-advanced" className="calc-advanced__body">
            <Switch label={t("params.noElevator")} checked={input.noElevator} onChange={(v) => p({ noElevator: v })} />
            <Segmented
              name="urgency"
              label={t("params.urgency")}
              value={input.urgency}
              onChange={(v) => p({ urgency: v })}
              options={[
                { value: "normal", label: t("params.urgencyNormal") },
                { value: "fast", label: t("params.urgencyFast") },
              ]}
            />
            <div>
              <Segmented
                name="style"
                label={t("params.style")}
                value={input.style}
                onChange={(v) => p({ style: v })}
                options={[
                  { value: "modern", label: t("params.styleModern") },
                  { value: "minimal", label: t("params.styleMinimal") },
                  { value: "classic", label: t("params.styleClassic") },
                  { value: "unknown", label: t("params.styleUnknown") },
                ]}
              />
              <p className="calc-hint">{t("params.styleHint")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Шаг 3: состав работ */
export function Step3({ input, dispatch }: StepProps) {
  const t = useTranslations("calc");
  const commercial = isCommercial(input.objectType);
  return (
    <div className="calc-step">
      <fieldset className="calc-group">
        <legend className="field-label">{t("scope.presetLabel")}</legend>
        <div className="calc-presets" role="radiogroup" aria-label={t("scope.presetLabel")}>
          {PRESETS.map((pr) => (
            <button
              key={pr}
              type="button"
              role="radio"
              aria-checked={input.preset === pr}
              className="chip"
              onClick={() => dispatch({ type: "preset", preset: pr })}
            >
              {t(`scope.${pr}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="calc-group">
        <legend className="field-label">{t("scope.packagesLabel")}</legend>
        <div className="pkg-grid">
          {PACKAGE_IDS.map((id) => (
            <label key={id} className="pkg">
              <input type="checkbox" checked={input.packages.includes(id)} onChange={() => dispatch({ type: "togglePackage", id })} />
              <span className="pkg__body">
                <span className="pkg__title">{t(`packages.${id}.title`)}</span>
                <span className="pkg__text">{t(`packages.${id}.text`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="calc-group">
        <legend className="field-label">{t("scope.addonsLabel")}</legend>
        <div className="calc-addons">
          <Segmented
            name="heated"
            label={t("scope.heatedFloor")}
            value={input.heatedFloor}
            onChange={(v) => dispatch({ type: "patch", patch: { heatedFloor: v } })}
            options={[
              { value: "none", label: t("scope.heatedNone") },
              { value: "bathrooms", label: t("scope.heatedBath") },
              { value: "all", label: t("scope.heatedAll") },
            ]}
          />
          <Segmented
            name="layout"
            label={t("scope.layout")}
            value={input.layout}
            onChange={(v) => dispatch({ type: "patch", patch: { layout: v } })}
            options={[
              { value: "none", label: t("scope.layoutNone") },
              { value: "small", label: t("scope.layoutSmall") },
              { value: "medium", label: t("scope.layoutMedium") },
              { value: "large", label: t("scope.layoutLarge") },
            ]}
          />
          {commercial && <Switch label={t("scope.hvac")} checked={input.hvac} onChange={(v) => dispatch({ type: "patch", patch: { hvac: v } })} />}
          <Switch label={t("scope.unsure")} checked={input.scopeUnsure} onChange={(v) => dispatch({ type: "patch", patch: { scopeUnsure: v } })} />
        </div>
      </fieldset>
    </div>
  );
}

/** Шаг 4: материалы и класс. classHints: подсказка цены за м² (только если цены утверждены). */
export function Step4({ input, dispatch, classHints }: StepProps & { classHints: Partial<Record<FinishClass, string>> }) {
  const t = useTranslations("calc");
  return (
    <div className="calc-step">
      <fieldset className="calc-group">
        <legend className="field-label">{t("materials.label")}</legend>
        <div className="opt-grid opt-grid--two">
          <OptionCard
            name="materials"
            value="ruh"
            checked={input.materials === "ruh"}
            onChange={() => dispatch({ type: "patch", patch: { materials: "ruh" } })}
            title={t("materials.ruh")}
            text={t("materials.ruhHint")}
          />
          <OptionCard
            name="materials"
            value="client"
            checked={input.materials === "client"}
            onChange={() => dispatch({ type: "patch", patch: { materials: "client" } })}
            title={t("materials.client")}
            text={t("materials.clientHint")}
          />
        </div>
      </fieldset>

      <fieldset className="calc-group">
        <legend className="field-label">{t("class.label")}</legend>
        <div className="opt-grid opt-grid--class">
          {CLASSES.map((c) => (
            <OptionCard
              key={c}
              name="finishClass"
              value={c}
              checked={input.finishClass === c}
              onChange={() => dispatch({ type: "patch", patch: { finishClass: c } })}
              title={t(`class.${c}`)}
              text={t(`class.${c}Text`)}
              badge={classHints[c]}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
