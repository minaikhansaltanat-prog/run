"use client";
// Баннер cookies. Показывается только если подключены трекеры (заданы GA4 или Meta Pixel).
// Трекеры загружаются после согласия; отказ не ломает сайт.
import { useEffect, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

const GA = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const KEY = "ruh_consent";

export function ConsentBanner() {
  const t = useTranslations("consentBanner");
  const [state, setState] = useState<"unknown" | "accepted" | "declined">("unknown");
  const hasTrackers = Boolean(GA || PIXEL);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === "accepted" || v === "declined") setState(v);
    } catch {
      /* localStorage недоступен: баннер просто покажется снова */
    }
  }, []);

  if (!hasTrackers) return null;

  const choose = (v: "accepted" | "declined") => {
    setState(v);
    try {
      window.localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {state === "accepted" && GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script
            id="ga-init"
            strategy="afterInteractive"
          >{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA}');`}</Script>
        </>
      )}
      {state === "accepted" && PIXEL && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
        >{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
      )}
      {state === "unknown" && (
        <div className="consent" role="region" aria-label={t("label")}>
          <p>{t("text")}</p>
          <div className="consent__actions">
            <button type="button" className="btn btn-gold btn-sm" onClick={() => choose("accepted")}>
              {t("accept")}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => choose("declined")}>
              {t("decline")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
