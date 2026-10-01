"use client";
// Галерея (ТЗ раздел 14): justified-ряды без обрезки кадра, фильтры в URL, lightbox, порционная отрисовка.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, MagnifyingGlassPlus } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { track } from "@/lib/analytics";
import type { GalleryTile } from "./types";

// lightbox тяжелее сетки: грузим только при первом открытии
const Lightbox = dynamic(() => import("./Lightbox").then((m) => m.Lightbox), { ssr: false });

const ROOM_FILTERS = ["living", "kitchen", "bedroom", "bathroom", "hall", "balcony", "detail"] as const;

interface Props {
  tiles: GalleryTile[];
  /** сколько плиток показывать сразу */
  initial: number;
  /** шаг "Показать еще" (0 = без кнопки, режим превью на главной) */
  pageSize?: number;
  mode: "preview" | "page" | "object";
}

export function GalleryGrid({ tiles, initial, pageSize = 0, mode }: Props) {
  const t = useTranslations("gallery");
  const [filter, setFilter] = useState<string>("all");
  const [visible, setVisible] = useState(initial);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  // фильтры: только те, где есть фото и результат отличается от "Все"
  const filters = useMemo(() => {
    const out: string[] = ["all"];
    const types = new Set(tiles.map((x) => x.objectType));
    if (types.size > 1) out.push("apartment", "commercial");
    for (const r of ROOM_FILTERS) {
      const n = tiles.filter((x) => x.room === r).length;
      if (n > 0 && n < tiles.length) out.push(r);
    }
    if (tiles.some((x) => x.pairId)) out.push("beforeAfter");
    return out;
  }, [tiles]);

  const apply = useCallback(
    (f: string) => {
      if (f === "all") return tiles;
      if (f === "apartment" || f === "commercial") return tiles.filter((x) => x.objectType === f);
      if (f === "beforeAfter") return tiles.filter((x) => x.pairId);
      return tiles.filter((x) => x.room === f);
    },
    [tiles],
  );
  const filtered = useMemo(() => apply(filter), [apply, filter]);
  const shown = filtered.slice(0, visible);

  // фильтр из URL и прямая ссылка на фото (#photo-ph-0001)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room && filters.includes(room)) setFilter(room);
    const m = /^#photo-(.+)$/.exec(window.location.hash);
    if (m) {
      const i = tiles.findIndex((x) => x.id === m[1]);
      if (i >= 0) {
        setFilter("all");
        setVisible(Math.max(initial, i + 1));
        setOpenIndex(i);
      }
    }
    // выполняем один раз при загрузке
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(f: string) {
    setFilter(f);
    setVisible(initial);
    const url = new URL(window.location.href);
    if (f === "all") url.searchParams.delete("room");
    else url.searchParams.set("room", f);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    track("gallery_filter", { filter: f });
  }

  function openAt(i: number, el: HTMLElement) {
    returnTo.current = el;
    setOpenIndex(i);
    track("gallery_open", { id: filtered[i]?.id });
  }
  function closeBox() {
    setOpenIndex(null);
    window.setTimeout(() => returnTo.current?.focus?.(), 40);
  }

  const label = (f: string) => t(`filters.${f}`);
  const hasMore = pageSize > 0 && visible < filtered.length;

  return (
    <div className="gallery" data-mode={mode}>
      {mode !== "object" && filters.length > 1 && (
        <div className="gallery__filters" role="group" aria-label={t("filtersLabel")}>
          {filters.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => choose(f)}>
              {label(f)}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="gallery__empty">
          <p>{t("empty")}</p>
          <button type="button" className="btn btn-dark btn-sm" onClick={() => choose("all")}>
            {t("reset")}
          </button>
        </div>
      ) : (
        <ul className="jgrid" role="list">
          {shown.map((tile, i) => {
            const ratio = tile.width / tile.height;
            return (
              <li key={tile.id} className="jitem" style={{ ["--r" as string]: ratio.toFixed(4) }} id={`photo-${tile.id}`}>
                <button type="button" className="jitem__btn" onClick={(e) => openAt(i, e.currentTarget)} aria-label={t("open", { alt: tile.alt })}>
                  <i aria-hidden="true" />
                  <Photo
                    file={tile.file}
                    widths={tile.widths}
                    width={tile.width}
                    height={tile.height}
                    alt={tile.alt}
                    sizes="(max-width: 767px) 50vw, (max-width: 1023px) 34vw, 24vw"
                    dominant={tile.dominant}
                    lqip={tile.lqip}
                    className="jitem__img"
                  />
                  <span className="jitem__veil" aria-hidden="true" />
                  <span className="jitem__zoom" aria-hidden="true">
                    <MagnifyingGlassPlus size={20} weight="bold" />
                  </span>
                  {tile.pairId && <span className="jitem__badge">{t("beforeAfterBadge")}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {mode === "page" && filtered.length > 0 && (
        <div className="gallery__more">
          <p className="tnum" aria-live="polite">
            {t("shown", { shown: shown.length, total: filtered.length })}
          </p>
          {hasMore && (
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                setVisible((v) => v + pageSize);
                track("gallery_load_more");
              }}
            >
              {t("loadMore")}
            </button>
          )}
        </div>
      )}

      {mode === "preview" && (
        <div className="gallery__more">
          <Link href="/gallery" className="btn btn-dark btn-lg">
            {t("viewAll", { count: tiles.length })}
            <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
          </Link>
        </div>
      )}

      {openIndex !== null && <Lightbox items={filtered} index={Math.min(openIndex, filtered.length - 1)} onIndex={setOpenIndex} onClose={closeBox} />}
    </div>
  );
}
