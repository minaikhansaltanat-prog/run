"use client";
// Карта по запросу: iframe Google Maps загружается только после нажатия (быстрый LCP, нет сторонних cookie на загрузке)
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin } from "@phosphor-icons/react";
import { site } from "@config/site";

export function MapFacade() {
  const t = useTranslations("footer");
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="map-facade">
      {loaded ? (
        <iframe title={t("mapTitle")} src={site.mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <button type="button" className="map-facade__btn" onClick={() => setLoaded(true)}>
          <span className="map-facade__pin" aria-hidden="true">
            <MapPin size={26} weight="fill" />
          </span>
          <span className="map-facade__text">{t("showMap")}</span>
        </button>
      )}
    </div>
  );
}
