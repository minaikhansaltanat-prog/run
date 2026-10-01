"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretUp } from "@phosphor-icons/react";
import { formatNumber } from "@/lib/estimate/format";
import type { EstimateInput } from "@/lib/estimate/types";
import type { PublicEstimate } from "@/lib/estimate/types";

/** Плавно меняет число (до 400 мс); при prefers-reduced-motion обновляет сразу */
export function useAnimatedNumber(target: number, ms = 400): number {
  const [v, setV] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || current.current === target) {
      current.current = target;
      setV(target);
      return;
    }
    const from = current.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - k, 3);
      const val = from + (target - from) * eased;
      current.current = val;
      setV(val);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

interface Props {
  input: EstimateInput;
  estimate: PublicEstimate | null;
  priced: boolean;
  /** режим мобильной шторки */
  sheet?: boolean;
  open?: boolean;
  onToggle?: () => void;
}

export function LivePanel({ input, estimate, priced, sheet = false, open = false, onToggle }: Props) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  const ok = priced && estimate && estimate.status === "ok" && estimate.priced ? estimate : null;
  const low = useAnimatedNumber(ok ? ok.low : 0);
  const high = useAnimatedNumber(ok ? ok.high : 0);

  const rows = [
    { k: t("live.summaryObject"), v: t(`objectType.${input.objectType}`) },
    { k: t("live.summaryArea"), v: `${input.area} ${tc("m2")}` },
    { k: t("live.summaryClass"), v: t(`class.${input.finishClass}`) },
    { k: t("live.summaryScope"), v: t(`scope.${input.preset}`) },
  ];

  const finalText = ok
    ? `${t("live.title")}: ${t("result.range", { low: formatNumber(ok.low), high: formatNumber(ok.high) })}`
    : t("live.manualText");
  const manualReason = estimate && estimate.status === "manual" ? estimate.reason : null;

  const body = (
    <>
      <div className="live__head">
        <p className="live__title">{t("live.title")}</p>
      </div>

      {ok ? (
        <div className="live__sum">
          <p className="live__range tnum" aria-hidden="true">
            <span>{formatNumber(low)}</span>
            <span className="live__dash"> - </span>
            <span className="live__nowrap">
              {formatNumber(high)}
              <span className="cur">{tc("currency")}</span>
            </span>
          </p>
          <p className="live__perm2 tnum" aria-hidden="true">
            {t("result.perM2", { low: formatNumber(ok.perM2Low), high: formatNumber(ok.perM2High) })}
          </p>
        </div>
      ) : (
        <div className="live__sum">
          <p className="live__manual-title">
            {manualReason === "area_range"
              ? t("manual.areaOutOfRange")
              : manualReason === "other_type"
                ? t("manual.otherType")
                : t("live.manualTitle")}
          </p>
          <p className="live__manual-text">{t("live.manualText")}</p>
        </div>
      )}

      <dl className="live__rows">
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>

      {ok && ok.breakdown.length > 0 && (
        <div className="live__bar" aria-hidden="true">
          {ok.breakdown.map((b) => (
            <i key={b.group} className={`seg-${b.group}`} style={{ flexGrow: b.sharePct }} />
          ))}
        </div>
      )}

      {/* озвучивается скринридером после остановки анимации */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {finalText}
      </p>
    </>
  );

  if (!sheet) return <div className="live">{body}</div>;

  return (
    <div className="live live--sheet" data-open={open ? "true" : "false"}>
      <button type="button" className="live__toggle" aria-expanded={open} onClick={onToggle}>
        <span className="live__toggle-label">{t("live.title")}</span>
        <span className="live__toggle-sum tnum" aria-hidden="true">
          {ok ? (
            <>
              {`${formatNumber(low)} - ${formatNumber(high)}`}
              <span className="cur">{tc("currency")}</span>
            </>
          ) : (
            t("live.manualTitle")
          )}
        </span>
        <CaretUp size={18} weight="bold" aria-hidden="true" className="live__toggle-icon" />
        <span className="visually-hidden">{open ? t("live.collapse") : t("live.expand")}</span>
      </button>
      {open && <div className="live__sheet-body">{body}</div>}
    </div>
  );
}
