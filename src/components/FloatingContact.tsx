"use client";
// Плавающая кнопка связи справа внизу (WhatsApp, Telegram, звонок).
// Золотая кнопка с мягкими волнами: золотая и зеленая (WhatsApp) волны накладываются друг на друга,
// иконка периодически "вибрирует". Анимируются только transform и opacity; при prefers-reduced-motion волн нет.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChatCircleDots, Phone, TelegramLogo, WhatsappLogo, X } from "@phosphor-icons/react";
import { track } from "@/lib/analytics";
import { site, whatsappLink } from "@config/site";

export function FloatingContact() {
  const t = useTranslations("floating");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fab" data-open={open ? "true" : "false"}>
      <ul className="fab__menu" role="list" aria-label={t("title")} id="fab-menu" aria-hidden={!open} inert={!open}>
        <li style={{ ["--i" as string]: 2 }}>
          <a
            className="fab__item"
            href={whatsappLink(t("whatsappText"))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("click_whatsapp", { place: "fab" })}
          >
            <span className="fab__plate fab__plate--wa" aria-hidden="true">
              <WhatsappLogo size={24} weight="fill" />
            </span>
            {t("whatsapp")}
          </a>
        </li>
        <li style={{ ["--i" as string]: 1 }}>
          <a
            className="fab__item"
            href={site.telegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("click_telegram", { place: "fab" })}
          >
            <span className="fab__plate fab__plate--tg" aria-hidden="true">
              <TelegramLogo size={24} weight="fill" />
            </span>
            {t("telegram")}
          </a>
        </li>
        <li style={{ ["--i" as string]: 0 }}>
          <a className="fab__item" href={site.phone.tel} onClick={() => track("click_phone", { place: "fab" })}>
            <span className="fab__plate fab__plate--call" aria-hidden="true">
              <Phone size={24} weight="fill" />
            </span>
            {t("call")}
          </a>
        </li>
      </ul>

      <div className="fab__stack">
        {/* волны: золотая и зеленая вперемежку */}
        <span className="fab__wave fab__wave--gold" aria-hidden="true" />
        <span className="fab__wave fab__wave--green" aria-hidden="true" />
        <span className="fab__wave fab__wave--gold fab__wave--late" aria-hidden="true" />
        <button
          ref={btnRef}
          type="button"
          className="fab__button"
          aria-expanded={open}
          aria-controls="fab-menu"
          aria-label={open ? t("close") : t("open")}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="fab__icon fab__icon--chat" aria-hidden="true">
            <ChatCircleDots size={30} weight="fill" />
          </span>
          <span className="fab__icon fab__icon--close" aria-hidden="true">
            <X size={26} weight="bold" />
          </span>
        </button>
      </div>
    </div>
  );
}
