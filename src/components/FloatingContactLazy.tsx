"use client";
// Плавающая кнопка связи не нужна для первого экрана: подключаем ее, когда браузер освободился.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const FloatingContact = dynamic(() => import("./FloatingContact").then((m) => m.FloatingContact), { ssr: false });

export function FloatingContactLazy() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 2500 });
      return () => (window as unknown as { cancelIdleCallback?: (n: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);
  return ready ? <FloatingContact /> : null;
}
