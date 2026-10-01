"use client";
// Смета-калькулятор (ТЗ раздел 13): 5 шагов, живая смета, экран результата, заявка.
// Цены приходят в компонент только если прайс утвержден (или включен предпросмотр на закрытом стенде);
// иначе калькулятор работает в режиме "сбор параметров" и цифр не показывает.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { estimate, estimateAllClasses, toPublic } from "@/lib/estimate/engine";
import { formatNumber } from "@/lib/estimate/format";
import type { Pricing } from "@/lib/estimate/schema";
import type { EstimateInput, FinishClass, PublicEstimate } from "@/lib/estimate/types";
import { track, areaBucket } from "@/lib/analytics";
import type { GalleryTile } from "@/components/gallery/types";
import { initialInput, MAX_AREA, MIN_AREA, parseParams, reducer, toParams, type Action } from "./state";
import { Step1, Step2, Step3, Step4 } from "./steps";
import { LivePanel } from "./LivePanel";
import { ManualResult, Result } from "./Result";
import { H } from "./heading";

const STORAGE_KEY = "ruh_calc_v1";
const CALC_KEYS = [
  "type",
  "cond",
  "area",
  "baths",
  "ceil",
  "project",
  "noelev",
  "urgency",
  "style",
  "preset",
  "pkg",
  "unsure",
  "heated",
  "layout",
  "hvac",
  "mat",
  "class",
  "step",
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

interface Props {
  /** null: цены не утверждены, режим сбора параметров */
  pricing: Pricing | null;
  /** разрешен ли предпросмотр цен (?pricing=preview) на закрытом стенде */
  allowPreview: boolean;
  similar: GalleryTile[];
  /** уровень заголовка шага: 3 в блоке главной (под h2), 2 на странице калькулятора (под h1) */
  level?: number;
}

export function Calculator({ pricing, allowPreview, similar, level = 3 }: Props) {
  const t = useTranslations("calc");
  const searchParams = useSearchParams();
  const preview = allowPreview && searchParams.get("pricing") === "preview";
  const priced = Boolean(pricing && (pricing.pricingApproved || preview));

  const [input, dispatchRaw] = useReducer(reducer, undefined, initialInput);
  const [step, setStep] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inView, setInView] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const hydrated = useRef(false);
  const lastWritten = useRef<string | null>(null);
  const opened = useRef(false);

  const dispatch = useCallback((a: Action) => {
    if (!started.current) {
      started.current = true;
      track("calc_start");
    }
    if (a.type === "preset") track("calc_preset_change", { preset: a.preset });
    dispatchRaw(a);
  }, []);

  // 1) восстановление: параметры URL, иначе localStorage (с try/catch: интерфейс работает без него)
  useEffect(() => {
    const parsed = parseParams(new URLSearchParams(window.location.search), initialInput());
    if (parsed.hasParams) {
      dispatchRaw({ type: "replace", input: parsed.input });
      if (parsed.step) setStep(parsed.step);
    } else {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const p = parseParams(new URLSearchParams(saved), initialInput());
          if (p.hasParams) dispatchRaw({ type: "replace", input: p.input });
        }
      } catch {
        /* localStorage недоступен */
      }
    }
    lastWritten.current = new URLSearchParams(window.location.search).toString();
    hydrated.current = true;
  }, []);

  // 2) предвыбор из ссылок на карточках (/?type=office#calculator) при переходе внутри страницы
  const spString = searchParams.toString();
  useEffect(() => {
    if (!hydrated.current || spString === lastWritten.current) return;
    const parsed = parseParams(new URLSearchParams(spString), initialInput());
    if (parsed.hasParams) {
      dispatchRaw({ type: "replace", input: parsed.input });
      setStep(parsed.step ?? 1);
    }
    lastWritten.current = spString;
  }, [spString]);

  // 3) запись состояния в URL и localStorage
  useEffect(() => {
    if (!hydrated.current) return;
    const mine = toParams(input, step);
    const url = new URL(window.location.href);
    for (const k of CALC_KEYS) url.searchParams.delete(k);
    mine.forEach((v, k) => url.searchParams.set(k, v));
    const qs = url.searchParams.toString();
    if (qs !== new URLSearchParams(window.location.search).toString()) {
      lastWritten.current = qs;
      window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, toParams(input, 1).toString());
    } catch {
      /* ignore */
    }
  }, [input, step]);

  // видимость блока: событие calc_open и мобильная шторка
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting && !opened.current) {
          opened.current = true;
          track("calc_open");
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // расчет
  const raw = useMemo(() => (priced && pricing ? estimate(input, pricing) : null), [priced, pricing, input]);
  const pub: PublicEstimate | null = useMemo(() => (raw && pricing ? toPublic(raw, pricing, preview) : null), [raw, pricing, preview]);
  const compare = useMemo(() => (priced && pricing ? estimateAllClasses(input, pricing) : null), [priced, pricing, input]);

  const manualReason = useMemo(() => {
    if (input.objectType === "other") return "other_type";
    if (input.area < MIN_AREA || input.area > MAX_AREA) return "area_range";
    return pub && pub.status === "manual" ? pub.reason : null;
  }, [input.objectType, input.area, pub]);

  const classHints = useMemo(() => {
    if (!priced || !pricing) return {};
    const out: Partial<Record<FinishClass, string>> = {};
    for (const c of ["standard", "comfort", "premium"] as const) {
      const r = estimate({ ...input, finishClass: c }, pricing);
      if (r.status === "ok") out[c] = t("class.fromPerM2", { value: formatNumber(r.perM2Low) });
    }
    return out;
  }, [priced, pricing, input, t]);

  // шаги
  const goTo = useCallback((n: number, scroll = true) => {
    setStep(n);
    track("calc_step_view", { step: n });
    if (scroll) {
      window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    }
  }, []);

  useEffect(() => {
    if (step !== 5) return;
    if (pub && pub.status === "ok" && pub.priced)
      track("calc_result_view", { type: input.objectType, area: areaBucket(input.area), class: input.finishClass });
    else track("calc_manual_mode_shown", { type: input.objectType, reason: manualReason ?? "pricing" });
    // событие один раз при входе на шаг 5
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // шторка на телефоне и смещение плавающей кнопки
  const sheetVisible = priced && !isDesktop && inView && step < 5;
  useEffect(() => {
    document.documentElement.dataset.calcSheet = sheetVisible ? "true" : "false";
    return () => {
      document.documentElement.dataset.calcSheet = "false";
    };
  }, [sheetVisible]);

  const canNext = step !== 2 || (input.area > 0 && Number.isFinite(input.area));
  const resultOk = pub && pub.status === "ok" && pub.priced ? pub : null;

  const stepContent = (() => {
    switch (step) {
      case 1:
        return <Step1 input={input} dispatch={dispatch} />;
      case 2:
        return <Step2 input={input} dispatch={dispatch} />;
      case 3:
        return <Step3 input={input} dispatch={dispatch} />;
      case 4:
        return <Step4 input={input} dispatch={dispatch} classHints={classHints} />;
      default:
        return resultOk && compare && !manualReason ? (
          <Result
            input={input}
            result={resultOk}
            compare={compare}
            similar={similar}
            onChangeClass={(c) => dispatch({ type: "patch", patch: { finishClass: c } })}
            onEdit={() => goTo(4)}
            level={level + 1}
          />
        ) : (
          <ManualResult input={input} reason={manualReason} onEdit={() => goTo(1)} level={level + 1} />
        );
    }
  })();

  return (
    <div ref={rootRef} className="calc" data-step={step} data-result={step === 5 ? "true" : "false"}>
      <div className="calc__main">
        <ol className="calc-rail" aria-label={t("stepOf", { n: step, total: 5 })}>
          {[1, 2, 3, 4, 5].map((n) => (
            <li key={n} data-state={n === step ? "current" : n < step ? "done" : "todo"}>
              <button type="button" className="calc-rail__btn" aria-current={n === step ? "step" : undefined} onClick={() => goTo(n, false)}>
                <span className="calc-rail__num tnum">{n}</span>
                <span className="calc-rail__label">{t(`stepShort.${n}`)}</span>
              </button>
            </li>
          ))}
        </ol>

        <div ref={cardRef} className="calc-card panel">
          <header className="calc-card__head">
            <p className="calc-card__step tnum">{t("stepOf", { n: step, total: 5 })}</p>
            <H level={level} className="calc-card__title">
              {t(`stepTitles.${step}`)}
            </H>
          </header>
          <div className="calc-card__body" key={step}>
            {stepContent}
          </div>
          {step < 5 && (
            <footer className="calc-card__foot">
              <button type="button" className="btn btn-outline" onClick={() => goTo(step - 1)} disabled={step === 1} aria-disabled={step === 1}>
                <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                {t("back")}
              </button>
              <button type="button" className="btn btn-gold" onClick={() => goTo(step + 1)} disabled={!canNext}>
                {step === 4 ? t("toResult") : t("next")}
                <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
              </button>
            </footer>
          )}
        </div>
      </div>

      {step < 5 && isDesktop && (
        <aside className="calc__aside" aria-label={t("live.title")}>
          <div className="calc__sticky band-dark on-dark">
            <LivePanel input={input} estimate={pub} priced={priced} />
          </div>
        </aside>
      )}

      {sheetVisible && <LivePanel input={input} estimate={pub} priced={priced} sheet open={sheetOpen} onToggle={() => setSheetOpen((v) => !v)} />}
    </div>
  );
}
