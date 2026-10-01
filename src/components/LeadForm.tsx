"use client";
// Общая форма заявки: короткая (имя, телефон).
// Защита: honeypot, ловушка по времени, маска телефона, валидация; запасной путь через WhatsApp.
import { useId, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { getAttribution } from "@/lib/attribution";
import { maskPhoneOnChange, isValidPhone } from "@/lib/phone";
import { track } from "@/lib/analytics";
import { STATIC_SITE } from "@/lib/site-mode";
import { buildStaticLead } from "@/lib/lead-static";
import type { LeadMethod, LeadType } from "@/lib/lead-labels";
import { whatsappLink } from "@config/site";

interface Props {
  type: LeadType;
  submitLabel: string;
  sendingLabel: string;
  /** сообщение внутри формы после успеха */
  successMessage?: string;
  /** запасное сообщение для WhatsApp, если сервер недоступен */
  fallbackText: string;
  showMethod?: boolean;
  dark?: boolean;
  idPrefix?: string;
}

export function LeadForm({ type, submitLabel, sendingLabel, successMessage, fallbackText, showMethod = true, dark = false, idPrefix }: Props) {
  const t = useTranslations("cta");
  const locale = useLocale() as "ru" | "kk";
  const uid = useId();
  const id = idPrefix ?? `lead-${uid.replace(/:/g, "")}`;
  const openedAt = useRef<number>(0);
  if (openedAt.current === 0 && typeof window !== "undefined") openedAt.current = Date.now();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<LeadMethod>("whatsapp");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error" | "whatsapp">("idle");
  /** статическая сборка: готовая ссылка на WhatsApp с текстом заявки */
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = t("validation.name");
    if (!isValidPhone(phone)) next.phone = t("validation.phone");
    if (!consent) next.consent = t("validation.consent");
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.phone) return phoneRef.current?.focus();
    if (next.consent) return consentRef.current?.focus();

    setStatus("sending");
    if (STATIC_SITE) return sendViaWhatsapp();
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: name.trim(),
          phone,
          method: showMethod ? method : "whatsapp",
          consent: true,
          locale,
          attribution: getAttribution(),
          hp,
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      track("lead_submit", { type, locale });
    } catch {
      setStatus("error");
    }
  }

  /**
   * Статическая сборка (GitHub Pages): сервера нет, заявка открывается в WhatsApp готовым сообщением.
   * Заявка считается отправленной, когда клиент нажмет "Отправить" в WhatsApp, и форма говорит об этом прямо.
   */
  function sendViaWhatsapp() {
    // ловушка для ботов: настоящий пользователь это поле не видит
    if (hp) {
      setStatus("whatsapp");
      return;
    }
    try {
      const msg = buildStaticLead({
        type,
        name: name.trim(),
        phone,
        method: showMethod ? method : "whatsapp",
        locale,
        attribution: getAttribution(),
      });
      setWaUrl(msg.url);
      setStatus("whatsapp");
      track("lead_submit", { type, locale });
      // на телефоне откроется приложение WhatsApp; если браузер блокирует окно, остается кнопка ниже
      window.open(msg.url, "_blank", "noopener,noreferrer");
    } catch {
      setStatus("error");
    }
  }

  if (status === "whatsapp") {
    return (
      <div className={`lead-success ${dark ? "on-dark" : ""}`} role="status" aria-live="polite">
        <CheckCircle size={40} weight="fill" aria-hidden="true" className="lead-success__icon" />
        <p>{t("staticSuccess")}</p>
        {waUrl && (
          <a
            className="btn btn-gold"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("click_whatsapp", { place: "form_static" })}
          >
            <WhatsappLogo size={20} aria-hidden="true" />
            {t("staticOpen")}
          </a>
        )}
      </div>
    );
  }

  if (status === "success" && successMessage) {
    return (
      <div className={`lead-success ${dark ? "on-dark" : ""}`} role="status" aria-live="polite">
        <CheckCircle size={40} weight="fill" aria-hidden="true" className="lead-success__icon" />
        <p>{successMessage}</p>
      </div>
    );
  }

  return (
    <form className={`lead-form ${dark ? "on-dark" : ""}`} onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-name`}>{t("name")}</label>
        <input
          ref={nameRef}
          id={`${id}-name`}
          name="name"
          className="input"
          type="text"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          value={name}
          maxLength={80}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id={`${id}-name-err`} className="field-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor={`${id}-phone`}>{t("phone")}</label>
        <input
          ref={phoneRef}
          id={`${id}-phone`}
          name="phone"
          className="input tnum"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 777 123 45 67"
          value={phone}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? `${id}-phone-err` : undefined}
          onFocus={() => !phone && setPhone("+7 ")}
          onBlur={() => phone.trim() === "+7" && setPhone("")}
          onChange={(e) => setPhone((prev) => maskPhoneOnChange(e.target.value, prev))}
        />
        {errors.phone && (
          <p id={`${id}-phone-err`} className="field-error" role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      {showMethod && (
        <fieldset className="field lead-form__method">
          <legend className="field-label">{t("method")}</legend>
          <div className="lead-form__chips" role="radiogroup" aria-label={t("method")}>
            {(["whatsapp", "telegram", "call"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                className={`chip ${dark ? "chip-dark" : ""}`}
                onClick={() => setMethod(m)}
              >
                {m === "whatsapp" ? t("methodWhatsapp") : m === "telegram" ? t("methodTelegram") : t("methodCall")}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* honeypot: настоящий пользователь это поле не видит */}
      <div className="hp-field" aria-hidden="true">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
        </label>
      </div>

      <div className="field">
        <label className="check" htmlFor={`${id}-consent`}>
          <input
            ref={consentRef}
            id={`${id}-consent`}
            type="checkbox"
            checked={consent}
            aria-invalid={errors.consent ? true : undefined}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            {t.rich("consent", {
              link: (chunks) => (
                <Link href="/privacy" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.consent && (
          <p className="field-error" role="alert">
            {errors.consent}
          </p>
        )}
      </div>

      <button type="submit" className="btn btn-gold btn-lg btn-block" disabled={status === "sending"} aria-busy={status === "sending"}>
        {status === "sending" ? (
          <>
            <span className="spinner" aria-hidden="true" />
            {sendingLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>

      {status === "error" && (
        <div className="lead-error" role="alert">
          <p>{t("error")}</p>
          <a
            className="btn btn-outline btn-sm"
            href={whatsappLink(fallbackText)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("click_whatsapp", { place: "form_error" })}
          >
            <WhatsappLogo size={20} aria-hidden="true" />
            {t("errorButton")}
          </a>
        </div>
      )}
    </form>
  );
}
