"use client";
// Появление блоков при скролле (ТЗ 7.6): только transform и opacity, через IntersectionObserver.
// Элементы, которые уже видны при загрузке, показываются сразу (без вспышки "скрыт - показан").
import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";

export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add("is-in");
      else io.observe(el);
    }
    root.classList.add("reveal-ready");
    // страховка: если что-то не успело сработать, через 4 c показываем всё, что уже прокручено выше экрана
    const safety = window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add("is-in");
      });
    }, 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [pathname]);
  return null;
}
