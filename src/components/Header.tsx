"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Gift, Phone, TelegramLogo, WhatsappLogo } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLink } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { openGift } from "@/lib/events";
import { track } from "@/lib/analytics";
import { site, whatsappLink } from "@config/site";

const NAV = [
  { key: "services", id: "services" },
  { key: "works", id: "works" },
  { key: "reviews", id: "reviews" },
  { key: "contacts", id: "contacts" },
] as const;

/**
 * Липкая шапка (ТЗ 6.1): fixed, прозрачная над фото hero, после 40 px скролла белое стекло.
 * Телефон: логотип слева, справа [RU|KK] и гамбургер. Гамбургер превращается в крестик (Х),
 * меню открывается на весь экран.
 */
export function Header() {
  const t = useTranslations("nav");
  const tf = useTranslations("floating");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // состояние "после скролла" без слушателя scroll: IntersectionObserver по сторожу в 40 px от верха
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // подсветка пункта меню по секции (только на главной)
  useEffect(() => {
    if (!isHome) {
      setActive(null);
      return;
    }
    const targets = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-38% 0px -57% 0px", threshold: 0 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [isHome, pathname]);

  const close = useCallback(() => setOpen(false), []);

  // блокировка прокрутки, Esc, возврат фокуса, ловушка Tab внутри шапки с меню
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
        return;
      }
      if (e.key === "Tab" && headerRef.current) {
        const f = Array.from(
          headerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
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
    // при расширении окна до десктопа меню закрывается
    const mq = window.matchMedia("(min-width: 1100px)");
    const onMq = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      unlockScroll();
    };
  }, [open]);

  // смена страницы закрывает меню
  useEffect(() => setOpen(false), [pathname]);

  const solid = !isHome;
  const state = solid || scrolled ? "scrolled" : "top";
  const href = (id: string) => ({ pathname: "/", hash: id }) as const;

  return (
    <>
      <div ref={sentinel} className="header-sentinel" aria-hidden="true" />
      <header ref={headerRef} className="site-header" data-state={state} data-open={open ? "true" : "false"}>
        <div className="container-x header-inner">
          <BrandLink label={t("home")} height={42} />

          <nav className="nav-desktop" aria-label={t("mainNav")}>
            <ul role="list">
              {NAV.map((n) => (
                <li key={n.key}>
                  <Link href={href(n.id)} className="nav-link" aria-current={active === n.id ? "location" : undefined}>
                    {t(n.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header-actions">
            <a
              className="header-phone-icon"
              href={site.phone.tel}
              aria-label={t("callPhone")}
              onClick={() => track("click_phone", { place: "header" })}
            >
              <Phone size={22} weight="regular" aria-hidden="true" />
            </a>
            <a className="header-phone" href={site.phone.tel} onClick={() => track("click_phone", { place: "header" })}>
              {site.phone.display}
            </a>
            <LanguageSwitcher />
            <Link href={href("contacts")} className="btn btn-gold btn-sm header-cta">
              {tc("leaveRequest")}
            </Link>
            <button
              ref={burgerRef}
              type="button"
              className="burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="burger__lines" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>

        {/* меню на весь экран: крупные пункты, подарок, контакты и золотая кнопка внизу */}
        <div id="mobile-menu" className="drawer on-dark" aria-hidden={!open} inert={!open} data-open={open ? "true" : "false"}>
          <div className="drawer__scroll">
            <nav aria-label={t("mobileMenuTitle")} className="drawer__nav">
              <ul role="list">
                {NAV.map((n, i) => (
                  <li key={n.key} style={{ ["--i" as string]: i }}>
                    <Link href={href(n.id)} className="drawer__link" onClick={close}>
                      <span className="drawer__index tnum">{String(i + 1).padStart(2, "0")}</span>
                      <span>{t(n.key)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <button
              type="button"
              className="drawer__gift"
              style={{ ["--i" as string]: NAV.length }}
              onClick={() => {
                close();
                // окно открывается после закрытия меню, чтобы не конфликтовать с блокировкой прокрутки
                window.setTimeout(openGift, 120);
              }}
            >
              <span className="icon-plate icon-plate-on" aria-hidden="true">
                <Gift size={26} weight="regular" />
              </span>
              <span>{t("gift")}</span>
              <ArrowRight size={20} aria-hidden="true" />
            </button>

            <div className="drawer__contacts" style={{ ["--i" as string]: NAV.length + 1 }}>
              <a href={site.phone.tel} className="drawer__phone tnum" onClick={() => track("click_phone", { place: "menu" })}>
                {site.phone.display}
              </a>
              <div className="drawer__messengers">
                <a
                  className="btn btn-outline-light btn-sm"
                  href={whatsappLink(tf("whatsappText"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("click_whatsapp", { place: "menu" })}
                >
                  <WhatsappLogo size={20} weight="regular" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  className="btn btn-outline-light btn-sm"
                  href={site.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("click_telegram", { place: "menu" })}
                >
                  <TelegramLogo size={20} weight="regular" aria-hidden="true" />
                  Telegram
                </a>
              </div>
            </div>

            <Link href={href("contacts")} className="btn btn-gold btn-lg btn-block drawer__cta" onClick={close}>
              {tc("leaveRequest")}
              <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
