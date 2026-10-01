"use client";
// Окно просмотра грузится только при первом открытии: на странице остается крошечный слушатель события.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PRICELIST_EVENT } from "@/lib/events";

const PriceListViewer = dynamic(() => import("./PriceListViewer").then((m) => m.PriceListViewer), { ssr: false });

export function PriceListHost() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const onOpen = () => setLoaded(true);
    window.addEventListener(PRICELIST_EVENT, onOpen, { once: true });
    return () => window.removeEventListener(PRICELIST_EVENT, onOpen);
  }, [loaded]);
  // startOpen: первое событие уже прошло, пока грузился код, поэтому окно открываем сразу при монтировании
  return loaded ? <PriceListViewer startOpen /> : null;
}
