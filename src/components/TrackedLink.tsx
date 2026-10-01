"use client";
import type { ReactNode } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Обычная внешняя ссылка с событием аналитики (клики WhatsApp, Telegram, телефон) */
export function TrackedLink({
  href,
  event,
  place,
  className,
  external = false,
  children,
  ariaLabel,
}: {
  href: string;
  event: AnalyticsEvent;
  place: string;
  className?: string;
  external?: boolean;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => track(event, { place })}
    >
      {children}
    </a>
  );
}
