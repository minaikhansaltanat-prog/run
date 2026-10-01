// Адаптивное фото: AVIF / WebP / JPEG, заданные width/height (нет скачков верстки), размытая заглушка.
import type { CSSProperties } from "react";

interface PhotoProps {
  /** база пути без ширины и расширения, например /img/ph-0001 */
  file: string;
  widths: number[];
  width: number;
  height: number;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  dominant?: string;
  lqip?: string;
  style?: CSSProperties;
  objectPosition?: string;
  draggable?: boolean;
}

const srcset = (file: string, widths: number[], ext: string) => widths.map((w) => `${file}-${w}.${ext} ${w}w`).join(", ");

export function Photo({
  file,
  widths,
  width,
  height,
  alt,
  sizes,
  priority,
  className,
  dominant,
  lqip,
  style,
  objectPosition,
  draggable,
}: PhotoProps) {
  const fallbackW = widths.includes(1200) ? 1200 : (widths[Math.floor(widths.length / 2)] ?? widths[0]);
  const bg: CSSProperties = {
    backgroundColor: dominant,
    backgroundImage: lqip ? `url(${lqip})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
    objectPosition,
    ...style,
  };
  return (
    <picture>
      <source type="image/avif" srcSet={srcset(file, widths, "avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(file, widths, "webp")} sizes={sizes} />
      <img
        src={`${file}-${fallbackW}.jpg`}
        srcSet={srcset(file, widths, "jpg")}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        className={className}
        style={bg}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={draggable}
      />
    </picture>
  );
}
