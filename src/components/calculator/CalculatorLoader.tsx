"use client";
// Калькулятор грузится, когда блок подходит к экрану (или сразу, если в адресе есть #calculator или параметры).
// До этого на странице лежит скелетон нужной высоты, поэтому нет скачков верстки, а первый JS легче.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Pricing } from "@/lib/estimate/schema";
import type { GalleryTile } from "@/components/gallery/types";

const Calculator = dynamic(() => import("./Calculator").then((m) => m.Calculator), {
  ssr: false,
  loading: () => <div className="calc-skeleton" aria-busy="true" />,
});

interface Props {
  pricing: Pricing | null;
  allowPreview: boolean;
  similar: GalleryTile[];
  level?: number;
}

export function CalculatorLoader(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hasParams = window.location.hash === "#calculator" || /[?&](type|class|project|preset|area|step|pricing)=/.test(window.location.search);
    if (hasParams || typeof IntersectionObserver === "undefined") {
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setGo(true);
          io.disconnect();
        }
      },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    // запасной вариант: если пользователь не прокрутил, подгружаем в простое
    const idle = window.setTimeout(() => setGo(true), 6000);
    return () => {
      io.disconnect();
      window.clearTimeout(idle);
    };
  }, []);

  return <div ref={ref}>{go ? <Calculator {...props} /> : <div className="calc-skeleton" aria-busy="true" />}</div>;
}
