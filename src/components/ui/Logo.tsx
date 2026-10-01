// Логотип RUH Construction. Версии по ТЗ 7.5: на светлом основной, на темном белая надпись.
// Горизонтальный вариант (знак + CONSTRUCTION) для шапки, знак отдельно для узких мест.
import { Link } from "@/i18n/navigation";
import { asset } from "@/lib/site-mode";

const RATIO_H = 2576.5 / 683; // из viewBox logo-h-*.svg

interface BrandProps {
  label: string;
  /** высота логотипа в px (минимум 28 по ТЗ 7.5) */
  height?: number;
  className?: string;
}

export function BrandLink({ label, height = 44, className }: BrandProps) {
  const w = Math.round(height * RATIO_H);
  return (
    <Link href="/" className={`brand ${className ?? ""}`} aria-label={label}>
      {/* две версии, CSS показывает нужную по состоянию шапки (над фото или после скролла) */}
      <img className="brand-on-dark" src={asset("/brand/logo-h-dark.svg")} width={w} height={height} alt="" />
      <img className="brand-on-light" src={asset("/brand/logo-h-light.svg")} width={w} height={height} alt="" />
    </Link>
  );
}

export function Emblem({ size = 44, className }: { size?: number; className?: string }) {
  return <img src={asset("/brand/emblem.svg")} width={Math.round(size * (595 / 683))} height={size} alt="" className={className} />;
}
