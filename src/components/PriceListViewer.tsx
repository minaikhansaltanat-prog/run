"use client";
// Просмотр прайс-листа на весь экран. Файла для скачивания нет: страницы-картинки (с водяным знаком RUH Construction)
// рисуются на canvas, а контекстное меню, перетаскивание, выделение, копирование, Ctrl+S / Ctrl+P / Ctrl+C и печать
// заблокированы. При уходе из окна и по клавише PrintScreen страницы закрываются размытием.
// Это препятствие, а не стопроцентная защита: снимок экрана телефона или фото экрана из браузера заблокировать нельзя,
// поэтому водяной знак нарисован на самих страницах.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, FileText, WhatsappLogo, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { TrackedLink } from "@/components/TrackedLink";
import { PRICELIST_EVENT } from "@/lib/events";
import { priceListDate, priceListPages, type PriceListPage } from "@/lib/pricelist";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { asset } from "@/lib/site-mode";
import { track } from "@/lib/analytics";
import { whatsappLink } from "@config/site";

const BLOCKED_KEYS = ["s", "p", "c", "x", "a", "u"];

function PageCanvas({ page, index, label, errorText }: { page: PriceListPage; index: number; label: string; errorText: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    async function load() {
      setState("loading");
      try {
        const img = new Image();
        img.decoding = "async";
        img.src = asset(page.file);
        await img.decode();
        if (cancelled) return;
        el!.getContext("2d")?.drawImage(img, 0, 0, page.width, page.height);
        setState("done");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    // страницы рисуются, когда подходят к экрану (первая сразу)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          void load();
        }
      },
      { rootMargin: "1400px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [page]);

  return (
    <div className="pl-page" data-page={index + 1} data-state={state} style={{ aspectRatio: `${page.width} / ${page.height}` }}>
      <canvas ref={ref} width={page.width} height={page.height} role="img" aria-label={label} />
      {state !== "done" && <span className="pl-page__skeleton" aria-hidden="true" />}
      {state === "error" && <p className="pl-page__error">{errorText}</p>}
    </div>
  );
}

export function PriceListViewer({ startOpen = false }: { startOpen?: boolean }) {
  const t = useTranslations("gift");
  const [open, setOpen] = useState(startOpen);
  const [current, setCurrent] = useState(1);
  const [shield, setShield] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const shieldTimer = useRef<number | undefined>(undefined);
  const date = useMemo(() => priceListDate(), []);
  const total = priceListPages.length;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    // окно подгружено по первому нажатию: событие уже прошло, открываем сразу
    if (startOpen) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      track("pricelist_open");
    }
    const onOpen = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setCurrent(1);
      setOpen(true);
      track("pricelist_open");
    };
    window.addEventListener(PRICELIST_EVENT, onOpen);
    return () => window.removeEventListener(PRICELIST_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // защита и управление, пока окно открыто
  useEffect(() => {
    if (!open) return;
    lockScroll();
    document.documentElement.classList.add("pricelist-open");

    const raise = (ms: number) => {
      setShield(true);
      window.clearTimeout(shieldTimer.current);
      shieldTimer.current = window.setTimeout(() => setShield(false), ms);
    };
    const block = (e: Event) => e.preventDefault();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === "PrintScreen") {
        raise(1800);
        return;
      }
      if (e.key !== "Tab") return;
      const f = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') ?? []);
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
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        raise(1800);
        try {
          // на Windows снимок попадает в буфер обмена: подменяем его пустой строкой
          void navigator.clipboard?.writeText(" ");
        } catch {
          /* буфер недоступен */
        }
      }
    };
    const hide = () => setShield(true);
    const show = () => {
      window.clearTimeout(shieldTimer.current);
      setShield(false);
    };
    const onVisibility = () => (document.hidden ? hide() : show());

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    for (const ev of ["contextmenu", "dragstart", "selectstart", "copy", "cut"]) document.addEventListener(ev, block, true);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);
    document.addEventListener("visibilitychange", onVisibility);
    const focusTimer = window.setTimeout(() => scrollRef.current?.focus({ preventScroll: true }), 80);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(shieldTimer.current);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      for (const ev of ["contextmenu", "dragstart", "selectstart", "copy", "cut"]) document.removeEventListener(ev, block, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
      document.removeEventListener("visibilitychange", onVisibility);
      document.documentElement.classList.remove("pricelist-open");
      setShield(false);
      unlockScroll();
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  // номер страницы по положению прокрутки
  useEffect(() => {
    if (!open) return;
    const root = scrollRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.page) || 1);
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    root.querySelectorAll("[data-page]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open]);

  if (!open) return null;

  return (
    <div ref={rootRef} className="pl-root" role="dialog" aria-modal="true" aria-label={t("viewerLabel")} data-shield={shield ? "true" : "false"}>
      <header className="pl-bar">
        <span className="pl-bar__icon" aria-hidden="true">
          <FileText size={24} weight="regular" />
        </span>
        <div className="pl-bar__text">
          <p className="pl-bar__name">{t("viewOnly")}</p>
        </div>
        <p className="pl-bar__page tnum">
          <span aria-hidden="true">
            {current} / {total}
          </span>
          <span className="visually-hidden" aria-live="polite">
            {t("pageOf", { n: current, total })}
          </span>
        </p>
        <button type="button" className="pl-close" onClick={close} aria-label={t("close")}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
      </header>

      <div ref={scrollRef} className="pl-scroll" tabIndex={0}>
        <div className="pl-pages">
          {priceListPages.map((p, i) => (
            <PageCanvas key={p.file} page={p} index={i} label={t("pageAlt", { n: i + 1, total, date })} errorText={t("error")} />
          ))}
        </div>
        <p className="pl-shield" aria-hidden="true">
          {t("pause")}
        </p>
      </div>

      <footer className="pl-actions">
        <Link href={{ pathname: "/", hash: "contacts" }} className="btn btn-gold" onClick={close}>
          {t("cta")}
          <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
        </Link>
        <TrackedLink href={whatsappLink(t("whatsappText"))} event="click_whatsapp" place="pricelist" className="btn btn-outline-light" external>
          <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
          <span className="pl-actions__label">{t("whatsapp")}</span>
        </TrackedLink>
      </footer>
    </div>
  );
}
