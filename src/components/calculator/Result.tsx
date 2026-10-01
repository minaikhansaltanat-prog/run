"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, CaretDown, CheckCircle, DownloadSimple, Ruler, WhatsappLogo } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { LeadForm, type LeadResult } from "@/components/LeadForm";
import { Photo } from "@/components/ui/Photo";
import type { GalleryTile } from "@/components/gallery/types";
import { formatNumber, formatRange } from "@/lib/estimate/format";
import { withCurrency } from "./money";
import { H } from "./heading";
import { track, areaBucket } from "@/lib/analytics";
import { STATIC_SITE } from "@/lib/site-mode";
import { whatsappLink } from "@config/site";
import {
  CLASSES,
  type BreakdownGroup,
  type EstimateInput,
  type EstimateResult,
  type FinishClass,
  type PackageId,
  type PublicEstimate,
} from "@/lib/estimate/types";

type Ok = Extract<PublicEstimate, { status: "ok" }> & { priced: true };

/** Скачивание PDF-сметы: сервер сам пересчитывает по своему прайсу */
async function fetchPdf(input: EstimateInput, locale: string, calcId: string | null, name?: string): Promise<boolean> {
  // статическая сборка (GitHub Pages) не умеет собирать PDF: нужен серверный деплой
  if (STATIC_SITE) return false;
  try {
    const res = await fetch("/api/calculator/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, locale, calcId, name }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RUH-Construction-${calcId ?? "estimate"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

/** Панель заявки внутри результата: подробная смета (PDF), замеры или ручной расчет */
export function LeadPanel({
  input,
  kind,
  priced,
  level = 4,
}: {
  input: EstimateInput;
  kind: "pdf" | "measure" | "manual";
  priced: boolean;
  level?: number;
}) {
  const t = useTranslations("calc");
  const locale = useLocale();
  const [done, setDone] = useState<null | { id: string | null; pdf: boolean | null }>(null);
  const [downloading, setDownloading] = useState(false);

  async function onSuccess(r: LeadResult) {
    track("calc_lead_submit", { kind, type: input.objectType, area: areaBucket(input.area), class: input.finishClass });
    if (kind === "pdf" && priced) {
      setDownloading(true);
      const ok = await fetchPdf(input, locale, r.id);
      setDownloading(false);
      if (ok) track("calc_pdf_download", { type: input.objectType });
      setDone({ id: r.id, pdf: ok });
    } else {
      setDone({ id: r.id, pdf: null });
    }
  }

  if (done) {
    return (
      <div className="lead-success" role="status" aria-live="polite">
        <CheckCircle size={40} weight="fill" aria-hidden="true" className="lead-success__icon" />
        <p>{done.pdf ? t("lead.successPdf") : done.pdf === false ? `${t("lead.success")} ${t("lead.pdfFailed")}` : t("lead.success")}</p>
        {done.pdf && (
          <button
            type="button"
            className="btn btn-gold"
            onClick={async () => {
              setDownloading(true);
              await fetchPdf(input, locale, done.id);
              setDownloading(false);
            }}
            disabled={downloading}
          >
            <DownloadSimple size={20} weight="bold" aria-hidden="true" />
            {t("lead.downloadPdf")}
          </button>
        )}
      </div>
    );
  }

  const title = kind === "pdf" ? t("lead.title") : kind === "measure" ? t("lead.titleMeasure") : t("lead.titleManual");
  return (
    <div className="lead-panel">
      <H level={level} className="lead-panel__title">
        {title}
      </H>
      <p className="lead-panel__text">{t("lead.text")}</p>
      <LeadForm
        type="calc"
        calc={{ kind, input }}
        idPrefix={`calc-${kind}`}
        submitLabel={t("lead.submit")}
        sendingLabel={t("lead.sending")}
        fallbackText={t("manual.whatsappText", { object: t(`objectType.${input.objectType}`), area: input.area })}
        onSuccess={onSuccess}
      />
    </div>
  );
}

const GROUPS: BreakdownGroup[] = ["prep", "engineering", "finishing", "logistics"];

interface ResultProps {
  input: EstimateInput;
  result: Ok;
  compare: Record<FinishClass, EstimateResult>;
  similar: GalleryTile[];
  onChangeClass: (c: FinishClass) => void;
  onEdit: () => void;
  /** уровень подзаголовков результата (на один ниже заголовка шага) */
  level?: number;
}

export function Result({ input, result, compare, similar, onChangeClass, onEdit, level = 4 }: ResultProps) {
  const t = useTranslations("calc");
  const tc = useTranslations("common");
  const [lead, setLead] = useState<null | "pdf" | "measure">(null);

  const range = t("result.range", { low: formatNumber(result.low), high: formatNumber(result.high) });
  const wa = whatsappLink(
    t("result.whatsappText", {
      object: t(`objectType.${input.objectType}`).toLowerCase(),
      area: input.area,
      class: t(`class.${input.finishClass}`),
      range: `${formatRange(result.low, result.high)} ₸`,
    }),
  );

  const includedPackages = input.packages as PackageId[];

  return (
    <div className="result">
      <section className="result__hero" aria-labelledby="result-title">
        <p id="result-title" className="result__eyebrow">
          {t("result.title")}
        </p>
        <p className="result__range tnum">{withCurrency(range)}</p>
        <p className="result__perm2 tnum">{t("result.perM2", { low: formatNumber(result.perM2Low), high: formatNumber(result.perM2High) })}</p>
        <p className="result__why">{t("result.why")}</p>
      </section>

      <section className="result__block" aria-labelledby="bd-title">
        <H level={level} id="bd-title" className="result__h">
          {t("result.breakdownTitle")}
        </H>
        <div className="breakdown__bar" role="img" aria-label={t("result.breakdownTitle")}>
          {result.breakdown.map((b) => (
            <i key={b.group} className={`seg-${b.group}`} style={{ flexGrow: b.sharePct }} />
          ))}
        </div>
        <table className="breakdown__table tnum">
          <tbody>
            {GROUPS.map((g) => {
              const b = result.breakdown.find((x) => x.group === g);
              if (!b) return null;
              return (
                <tr key={g}>
                  <th scope="row">
                    <i className={`dot seg-${g}`} aria-hidden="true" />
                    {t(`result.groups.${g}`)}
                  </th>
                  <td>
                    {formatNumber(b.amount)} {tc("currency")}
                  </td>
                  <td>{Math.round(b.sharePct)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="result__block" aria-labelledby="cmp-title">
        <H level={level} id="cmp-title" className="result__h">
          {t("result.compareTitle")}
        </H>
        <div className="compare">
          {CLASSES.map((c) => {
            const r = compare[c];
            if (r.status !== "ok") return null;
            const current = c === input.finishClass;
            return (
              <button
                key={c}
                type="button"
                className="compare__card"
                aria-pressed={current}
                onClick={() => {
                  track("calc_class_compare_click", { class: c });
                  onChangeClass(c);
                }}
              >
                <span className="compare__name">{t(`class.${c}`)}</span>
                <span className="compare__range tnum">
                  {formatNumber(r.low)} - {formatNumber(r.high)} {withCurrency(tc("currency"))}
                </span>
                <span className="compare__text">{t(`class.${c}Text`)}</span>
                {current && <span className="compare__current">{t("result.compareCurrent")}</span>}
              </button>
            );
          })}
        </div>
      </section>

      {result.timeline && (
        <p className="result__timeline tnum">
          <span>{t("result.timelineTitle")}: </span>
          <strong>{t("result.timelineValue", { from: result.timeline.weeksLow, to: result.timeline.weeksHigh })}</strong>
        </p>
      )}

      <div className="result__details">
        <details>
          <summary>
            {t("result.includedTitle")}
            <CaretDown size={18} weight="bold" aria-hidden="true" />
          </summary>
          <ul>
            {includedPackages.map((id) => (
              <li key={id}>{t(`packages.${id}.title`)}</li>
            ))}
            {input.materials === "ruh" && <li>{t("result.includedExtra")}</li>}
          </ul>
        </details>
        <details>
          <summary>
            {t("result.notIncludedTitle")}
            <CaretDown size={18} weight="bold" aria-hidden="true" />
          </summary>
          <ul>
            {(["furniture", "appliances", "fixtures", "design", "approvals"] as const).map((k) => (
              <li key={k}>{t(`result.notIncluded.${k}`)}</li>
            ))}
          </ul>
        </details>
        <details>
          <summary>
            {t("result.howTitle")}
            <CaretDown size={18} weight="bold" aria-hidden="true" />
          </summary>
          <p>{t("result.howText")}</p>
          <p className="result__hint">{t("result.hint")}</p>
        </details>
      </div>

      {similar.length > 0 && (
        <section className="result__block" aria-labelledby="sim-title">
          <H level={level} id="sim-title" className="result__h">
            {t("result.similarTitle")}
          </H>
          <ul className="similar" role="list">
            {similar.slice(0, 3).map((tile) => (
              <li key={tile.id}>
                <Link href={tile.objectSlug ? `/objects/${tile.objectSlug}` : "/gallery"} className="similar__link">
                  <Photo
                    file={tile.file}
                    widths={tile.widths}
                    width={tile.width}
                    height={tile.height}
                    alt={tile.alt}
                    sizes="(max-width: 767px) 33vw, 180px"
                    dominant={tile.dominant}
                    lqip={tile.lqip}
                    className="similar__img"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="result__cta" aria-label={t("result.pdfCta")}>
        <div className="result__cta-row">
          <button
            type="button"
            className="btn btn-gold btn-lg"
            aria-expanded={lead === "pdf"}
            onClick={() => {
              setLead("pdf");
              track("calc_cta_pdf_click");
            }}
          >
            <DownloadSimple size={20} weight="bold" aria-hidden="true" />
            {t("result.pdfCta")}
          </button>
          <button type="button" className="btn btn-dark btn-lg" aria-expanded={lead === "measure"} onClick={() => setLead("measure")}>
            <Ruler size={20} weight="regular" aria-hidden="true" />
            {t("result.measureCta")}
          </button>
          <a className="btn btn-outline btn-lg" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track("calc_whatsapp_click")}>
            <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
            {t("result.whatsappCta")}
          </a>
        </div>
        {lead && <LeadPanel key={lead} input={input} kind={lead} priced level={level + 1} />}
        <button type="button" className="link-arrow result__edit" onClick={onEdit}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          {t("result.editCta")}
        </button>
        <p className="result__disclaimer">{t("result.disclaimer")}</p>
      </section>
    </div>
  );
}

/** Результат без цены (прайс еще не утвержден, нестандартный объект или площадь вне диапазона) */
export function ManualResult({
  input,
  reason,
  onEdit,
  level = 4,
}: {
  input: EstimateInput;
  reason: string | null;
  onEdit: () => void;
  level?: number;
}) {
  const t = useTranslations("calc");
  const wa = whatsappLink(t("manual.whatsappText", { object: t(`objectType.${input.objectType}`).toLowerCase(), area: input.area }));
  return (
    <div className="result result--manual">
      <section className="result__hero">
        <p className="result__eyebrow">{t("stepTitles.5")}</p>
        <H level={level} className="result__manual-title">
          {t("manual.title")}
        </H>
        <p className="result__why">
          {reason === "area_range" ? t("manual.areaOutOfRange") : reason === "other_type" ? t("manual.otherType") : t("manual.text")}
        </p>
      </section>
      <section className="result__cta">
        <LeadPanel input={input} kind="manual" priced={false} level={level + 1} />
        <div className="result__cta-row">
          <a className="btn btn-outline" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => track("calc_whatsapp_click")}>
            <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
            {t("result.whatsappCta")}
          </a>
        </div>
        <button type="button" className="link-arrow result__edit" onClick={onEdit}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" />
          {t("result.editCta")}
        </button>
        <p className="result__disclaimer">{t("result.disclaimer")}</p>
      </section>
    </div>
  );
}
