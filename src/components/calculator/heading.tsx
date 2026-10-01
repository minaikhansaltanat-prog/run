import { createElement, type ReactNode } from "react";

/** Заголовок нужного уровня: калькулятор стоит и в блоке главной (под h2), и на своей странице (под h1) */
export function H({ level, className, id, children }: { level: number; className?: string; id?: string; children: ReactNode }) {
  return createElement(`h${Math.min(6, Math.max(1, level))}`, { className, id }, children);
}
