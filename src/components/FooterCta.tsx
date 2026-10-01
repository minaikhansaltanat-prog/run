"use client";
import { ArrowRight } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";

/** Золотая кнопка "Оставить заявку" в футере (вместо формы рассылки) */
export function FooterCta({ label }: { label: string }) {
  return (
    <Link href={{ pathname: "/", hash: "contacts" }} className="btn btn-gold footer__cta">
      {label}
      <ArrowRight size={18} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
    </Link>
  );
}
