"use client";
// Счет числа при появлении в окне (ТЗ 6.5): один раз, 1,2 с; при prefers-reduced-motion сразу итог.
// Итоговое значение лежит в разметке с сервера (работает без JS и для поисковиков).
import { useEffect, useRef } from "react";

export function CountUp({ to, decimals = 0, duration = 1200, className }: { to: number; decimals?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = to.toFixed(decimals);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      el.textContent = final;
      return;
    }
    const zero = (0).toFixed(decimals);
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (!inView) el.textContent = zero;
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = (to * eased).toFixed(decimals);
        if (k < 1) raf = requestAnimationFrame(tick);
        else el.textContent = final;
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = final;
    };
  }, [to, decimals, duration, final]);

  return (
    <span ref={ref} className={className}>
      {final}
    </span>
  );
}
