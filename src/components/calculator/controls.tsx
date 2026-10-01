"use client";
// Элементы управления калькулятора: настоящие radio/checkbox (клавиатура и скринридер работают из коробки)
import { useId, type ReactNode } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { MAX_AREA, MIN_AREA } from "./state";

/** Большая карточка выбора (radio) с иконкой */
export function OptionCard({
  name,
  value,
  checked,
  onChange,
  icon,
  title,
  text,
  badge,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (v: string) => void;
  icon?: ReactNode;
  title: string;
  text?: string;
  badge?: string;
}) {
  const id = useId();
  return (
    <label className="opt" htmlFor={id}>
      <input id={id} type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <span className="opt__body">
        {icon && (
          <span className="opt__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="opt__title">{title}</span>
        {text && <span className="opt__text">{text}</span>}
        {badge && <span className="opt__badge tnum">{badge}</span>}
      </span>
    </label>
  );
}

/** Компактный сегментированный переключатель (radio) */
export function Segmented<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={`seg ${className}`}>
      <legend className="field-label">{label}</legend>
      <div className="seg__row">
        {options.map((o) => (
          <label key={o.value} className="seg__item">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Переключатель да/нет */
export function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const id = useId();
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true">
        <i />
      </span>
      <span className="switch__text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** Счетчик с кнопками плюс и минус */
export function Stepper({
  label,
  value,
  min = 0,
  max = 99,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="stepper">
      <span className="field-label" id={`${id}-l`}>
        {label}
      </span>
      <div className="stepper__row" role="group" aria-labelledby={`${id}-l`}>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label}: -1`}
        >
          <Minus size={18} weight="bold" aria-hidden="true" />
        </button>
        <output className="stepper__value tnum" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label}: +1`}
        >
          <Plus size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Площадь: ползунок и числовое поле, согласованные друг с другом (шаг 1 м², клавиатура работает) */
export function AreaField({
  label,
  hint,
  value,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  error?: string | null;
}) {
  const id = useId();
  const clamped = Math.min(MAX_AREA, Math.max(MIN_AREA, value));
  const pct = ((clamped - MIN_AREA) / (MAX_AREA - MIN_AREA)) * 100;
  return (
    <div className="area">
      <div className="area__head">
        <label className="field-label" htmlFor={`${id}-n`}>
          {label}
        </label>
        <div className="area__num">
          <input
            id={`${id}-n`}
            className="input tnum"
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            step={1}
            value={Number.isFinite(value) && value > 0 ? value : ""}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-h`}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value));
              onChange(Number.isFinite(n) ? Math.min(2000, Math.max(0, n)) : 0);
            }}
          />
        </div>
      </div>
      <input
        className="range"
        type="range"
        min={MIN_AREA}
        max={MAX_AREA}
        step={1}
        value={clamped}
        aria-label={label}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p id={`${id}-h`} className={error ? "field-error" : "area__hint"} role={error ? "alert" : undefined}>
        {error ?? hint}
      </p>
    </div>
  );
}
