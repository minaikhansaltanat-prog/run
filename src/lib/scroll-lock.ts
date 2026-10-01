"use client";
// Блокировка прокрутки страницы под меню и окнами. Надежный для iOS способ: фиксируем body и
// запоминаем позицию, при разблокировке возвращаем ее без "прыжка".
// Счетчик нужен, если одно окно открывается поверх другого.

let locks = 0;
let savedY = 0;

export function lockScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) {
    savedY = window.scrollY;
    const root = document.documentElement;
    root.style.setProperty("--scroll-lock-top", `-${savedY}px`);
    // компенсируем исчезающую полосу прокрутки на десктопе
    const sb = window.innerWidth - root.clientWidth;
    if (sb > 0) root.style.setProperty("--scrollbar-comp", `${sb}px`);
    root.dataset.scrollLocked = "true";
  }
  locks += 1;
}

export function unlockScroll(): void {
  if (typeof document === "undefined" || locks === 0) return;
  locks -= 1;
  if (locks === 0) {
    const root = document.documentElement;
    delete root.dataset.scrollLocked;
    root.style.removeProperty("--scroll-lock-top");
    root.style.removeProperty("--scrollbar-comp");
    // мгновенно, без плавной прокрутки html { scroll-behavior: smooth }
    window.scrollTo({ top: savedY, behavior: "instant" });
  }
}
