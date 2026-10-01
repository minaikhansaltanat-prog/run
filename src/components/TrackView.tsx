"use client";
import { useEffect } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Отправляет событие аналитики один раз при показе страницы (например view_object) */
export function TrackView({ event, params }: { event: AnalyticsEvent; params?: Record<string, string> }) {
  useEffect(() => {
    track(event, params);
    // событие один раз на страницу
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
