import { getTranslations } from "next-intl/server";
import { Phone, TelegramLogo, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { LeadForm } from "@/components/LeadForm";
import { ClientMessages } from "@/components/ClientMessages";
import { GiftLink } from "@/components/GiftBanner";
import { TrackedLink } from "@/components/TrackedLink";
import { site, whatsappLink } from "@config/site";

/** Финальный блок (ТЗ 6.12): "Начнем с расчета", кнопки и короткая форма. Он же якорь "Контакты". */
export async function FinalCta() {
  const t = await getTranslations("cta");
  const accent = t("accent");
  const title = t("title");
  const i = title.indexOf(accent);
  const before = i >= 0 ? title.slice(0, i) : title;
  const after = i >= 0 ? title.slice(i + accent.length) : "";

  return (
    <section id="contacts" className="final-cta band-dark on-dark section" aria-labelledby="cta-title">
      <div className="container-x final-cta__grid">
        <div className="final-cta__copy" data-reveal>
          <h2 id="cta-title" className="h2">
            {before}
            {i >= 0 && <span className="accent">{accent}</span>}
            {after}
          </h2>
          <p className="lead">{t("text")}</p>
          <div className="final-cta__buttons">
            <TrackedLink href={site.phone.tel} event="click_phone" place="final_cta" className="btn btn-gold btn-lg">
              <Phone size={22} weight="regular" aria-hidden="true" />
              {t("call")}
            </TrackedLink>
            <TrackedLink
              href={whatsappLink(t("whatsappText"))}
              event="click_whatsapp"
              place="final_cta"
              className="btn btn-outline-light btn-lg"
              external
            >
              <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
              WhatsApp
            </TrackedLink>
            <TrackedLink href={site.telegram} event="click_telegram" place="final_cta" className="btn btn-outline-light btn-lg" external>
              <TelegramLogo size={22} weight="regular" aria-hidden="true" />
              Telegram
            </TrackedLink>
          </div>
          <ClientMessages namespaces={["nav"]}>
            <GiftLink className="final-cta__gift" />
          </ClientMessages>
        </div>

        <div className="final-cta__card" data-reveal style={{ ["--i" as string]: 1 }}>
          <h3 className="final-cta__form-title">{t("formTitle")}</h3>
          <ClientMessages namespaces={["cta"]}>
            <LeadForm
              type="short"
              dark
              idPrefix="cta"
              submitLabel={t("submit")}
              sendingLabel={t("sending")}
              successMessage={t("success")}
              fallbackText={t("whatsappText")}
            />
          </ClientMessages>
        </div>
      </div>
    </section>
  );
}
