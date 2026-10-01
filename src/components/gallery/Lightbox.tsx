"use client";
// Lightbox (ТЗ 14.4): Esc, стрелки, свайп, счетчик, ссылка на объект, "Рассчитать такой ремонт",
// предзагрузка соседних кадров, фокус возвращается на плитку, aria-modal, фокус-ловушка.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/Photo";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { track } from "@/lib/analytics";
import { asset } from "@/lib/site-mode";
import { whatsappLink } from "@config/site";
import type { GalleryTile } from "./types";

interface Props {
  items: GalleryTile[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const SWIPE_PX = 56;

function preload(tile: GalleryTile | undefined) {
  if (!tile) return;
  const w = tile.widths.includes(1600) ? 1600 : tile.widths[tile.widths.length - 1];
  const img = new Image();
  img.src = `${asset(tile.file)}-${w}.webp`;
}

export function Lightbox({ items, index, onIndex, onClose }: Props) {
  const t = useTranslations("gallery.lightbox");
  const total = items.length;
  const tile = items[index];
  const rootRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [zoom, setZoom] = useState<{ on: boolean; ox: number; oy: number; tx: number; ty: number }>({ on: false, ox: 50, oy: 50, tx: 0, ty: 0 });
  const [dir, setDir] = useState<1 | -1>(1);
  const pan = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => {
      setDir(delta > 0 ? 1 : -1);
      setZoom({ on: false, ox: 50, oy: 50, tx: 0, ty: 0 });
      onIndex((index + delta + total) % total);
    },
    [index, onIndex, total],
  );

  // блокировка прокрутки и клавиатура
  useEffect(() => {
    lockScroll();
    const root = rootRef.current;
    const focusables = () =>
      Array.from(root?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    window.setTimeout(() => root?.querySelector<HTMLElement>("[data-close]")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight") return go(1);
      if (e.key === "ArrowLeft") return go(-1);
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [go, onClose]);

  // ссылка на фото: #photo-ph-0001
  useEffect(() => {
    if (!tile) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#photo-${tile.id}`);
  }, [tile]);
  useEffect(
    () => () => {
      // при закрытии убираем хэш, не добавляя запись в историю
      if (window.location.hash.startsWith("#photo-")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    },
    [],
  );

  // предзагрузка соседних
  useEffect(() => {
    preload(items[(index + 1) % total]);
    preload(items[(index - 1 + total) % total]);
  }, [index, items, total]);

  if (!tile) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom.on) {
      pan.current = { x: e.clientX - zoom.tx, y: e.clientY - zoom.ty };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (zoom.on && pan.current) {
      setZoom((z) => ({ ...z, tx: e.clientX - pan.current!.x, ty: e.clientY - pan.current!.y }));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (zoom.on) {
      pan.current = null;
      return;
    }
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
  };
  const onDouble = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setZoom((z) =>
      z.on
        ? { on: false, ox: 50, oy: 50, tx: 0, ty: 0 }
        : { on: true, ox: ((e.clientX - r.left) / r.width) * 100, oy: ((e.clientY - r.top) / r.height) * 100, tx: 0, ty: 0 },
    );
  };

  return (
    <div ref={rootRef} className="lightbox dark-surface" role="dialog" aria-modal="true" aria-label={t("label")}>
      <div className="lightbox__bar">
        <p className="lightbox__counter tnum" aria-live="polite">
          {t("counter", { current: index + 1, total })}
        </p>
        {tile.objectSlug && tile.objectTitle && (
          <Link href={`/objects/${tile.objectSlug}`} className="lightbox__object" onClick={onClose}>
            {tile.objectTitle}
          </Link>
        )}
        <button type="button" className="lightbox__close" data-close onClick={onClose} aria-label={t("close")}>
          <X size={24} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div
        className="lightbox__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          pan.current = null;
        }}
        onDoubleClick={onDouble}
        data-zoom={zoom.on ? "true" : "false"}
      >
        <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t("prev")}>
          <CaretLeft size={26} weight="bold" aria-hidden="true" />
        </button>

        <div key={tile.id} className="lightbox__figure" data-dir={dir}>
          <div
            className="lightbox__zoom"
            style={{
              transformOrigin: `${zoom.ox}% ${zoom.oy}%`,
              transform: zoom.on ? `translate(${zoom.tx}px, ${zoom.ty}px) scale(2)` : "none",
            }}
          >
            <Photo
              file={tile.file}
              widths={tile.widths}
              width={tile.width}
              height={tile.height}
              alt={tile.alt}
              sizes="100vw"
              priority
              dominant={tile.dominant}
              lqip={tile.lqip}
              className="lightbox__img"
              draggable={false}
            />
          </div>
        </div>

        <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t("next")}>
          <CaretRight size={26} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="lightbox__foot">
        <p className="lightbox__alt">{tile.alt}</p>
        <div className="lightbox__actions">
          <a
            href={whatsappLink(`${t("whatsappText")}${tile.objectTitle ? ` (${tile.objectTitle})` : ""}`)}
            className="btn btn-gold"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("click_whatsapp", { place: "lightbox", id: tile.id })}
          >
            {t("wantCta")}
            <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
          </a>
          {tile.objectSlug && (
            <Link href={`/objects/${tile.objectSlug}`} className="btn btn-outline-light" onClick={onClose}>
              {t("viewObject")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
