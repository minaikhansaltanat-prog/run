"use client";
// Окно подарка грузится только при первом открытии: на странице остается крошечный слушатель события.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { GIFT_EVENT } from "@/lib/events";

const GiftDialog = dynamic(() => import("./GiftDialog").then((m) => m.GiftDialog), { ssr: false });

export function GiftDialogHost() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const onOpen = () => setLoaded(true);
    window.addEventListener(GIFT_EVENT, onOpen, { once: true });
    return () => window.removeEventListener(GIFT_EVENT, onOpen);
  }, [loaded]);
  // startOpen: первое событие уже прошло, пока грузился код, поэтому окно открываем сразу при монтировании
  return loaded ? <GiftDialog startOpen /> : null;
}
