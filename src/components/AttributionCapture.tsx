"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/** Запоминает UTM-метки при первом заходе (используются в заявках) */
export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
  }, []);
  return null;
}
