"use client";
// Подарок: прайс-лист (по просьбе клиента). Окно открывается из баннера, меню и финального блока.
// Заявка уходит в Telegram; если PDF уже лежит в public/downloads, он скачивается сразу после отправки.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DownloadSimple, Gift, X } from "@phosphor-icons/react";
import { LeadForm, type LeadResult } from "@/components/LeadForm";
import { GIFT_EVENT } from "@/lib/events";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { track } from "@/lib/analytics";

export function GiftDialog({ startOpen = false }: { startOpen?: boolean }) {
  const t = useTranslations("gift");
  const [open, setOpen] = useState(startOpen);
  const [result, setResult] = useState<LeadResult | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => setResult(null), 300);
  }, []);

  useEffect(() => {
    // окно подгружено по первому нажатию: событие уже прошло, открываем сразу
    if (startOpen) track("gift_open");
    const onOpen = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
      track("gift_open");
    };
    window.addEventListener(GIFT_EVENT, onOpen);
    return () => window.removeEventListener(GIFT_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])') ?? [],
      );
    window.setTimeout(() => focusables()[0]?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab") return;
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
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      returnFocus.current?.focus?.();
    };
  }, [open, close]);

  function onSuccess(r: LeadResult) {
    setResult(r);
    track("gift_submit");
    if (r.gift?.available && r.gift.file) {
      // автоматическое скачивание через временную ссылку
      const a = document.createElement("a");
      a.href = r.gift.file;
      a.download = "RUH-Construction-price-list.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      track("gift_download");
    }
  }

  if (!open) return null;

  return (
    <div className="dialog-root" role="presentation">
      <div className="dialog-backdrop" onClick={close} aria-hidden="true" />
      <div ref={panelRef} className="dialog-panel" role="dialog" aria-modal="true" aria-label={t("dialogLabel")}>
        <button type="button" className="dialog-close" onClick={close} aria-label={t("close")}>
          <X size={22} weight="bold" aria-hidden="true" />
        </button>
        <div className="dialog-head">
          <span className="icon-plate icon-plate-on" aria-hidden="true">
            <Gift size={28} weight="regular" />
          </span>
          <h2 className="h3 dialog-title">{t("dialogTitle")}</h2>
          <p className="dialog-text">{t("dialogText")}</p>
        </div>

        {result ? (
          <div className="lead-success" role="status" aria-live="polite">
            <p>{result.gift?.available ? t("successDownload") : t("successSend")}</p>
            {result.gift?.available && result.gift.file && (
              <a className="btn btn-gold" href={result.gift.file} download onClick={() => track("gift_download")}>
                <DownloadSimple size={20} weight="bold" aria-hidden="true" />
                {t("downloadAgain")}
              </a>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={close}>
              {t("close")}
            </button>
          </div>
        ) : (
          <LeadForm
            type="gift"
            showMethod={false}
            submitLabel={t("submit")}
            sendingLabel={t("submit")}
            fallbackText={t("whatsappText")}
            onSuccess={onSuccess}
            idPrefix="gift"
          />
        )}
      </div>
    </div>
  );
}
