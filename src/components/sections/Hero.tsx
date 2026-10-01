import { getTranslations } from "next-intl/server";
import { ArrowRight, ClipboardText, ShieldCheck, Star, Ruler } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { heroes } from "@/lib/gallery-data";
import { site } from "@config/site";

const srcset = (file: string, widths: number[], ext: string) => widths.map((w) => `${file}-${w}.${ext} ${w}w`).join(", ");

/**
 * Hero (ТЗ 6.2): фото на весь экран, слева текст, справа стеклянные бейджи.
 * Фон: ph-0001 (гостиная) на десктопе и ph-0003 (спальня, вертикальный кроп 9:16) на телефоне.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const d = heroes.desktop;
  const m = heroes.mobile;

  return (
    <section className="hero on-dark" id="top" aria-labelledby="hero-title">
      <div className="hero__media">
        {d ? (
          <picture>
            {m && (
              <>
                <source media="(max-width: 767.98px)" type="image/avif" srcSet={srcset(m.file, m.widths, "avif")} sizes="100vw" />
                <source media="(max-width: 767.98px)" type="image/webp" srcSet={srcset(m.file, m.widths, "webp")} sizes="100vw" />
                <source media="(max-width: 767.98px)" srcSet={srcset(m.file, m.widths, "jpg")} sizes="100vw" />
              </>
            )}
            <source type="image/avif" srcSet={srcset(d.file, d.widths, "avif")} sizes="100vw" />
            <source type="image/webp" srcSet={srcset(d.file, d.widths, "webp")} sizes="100vw" />
            <img
              className="hero__img"
              src={`${d.file}-1600.jpg`}
              srcSet={srcset(d.file, d.widths, "jpg")}
              sizes="100vw"
              width={d.width}
              height={d.height}
              alt={t("imageAlt")}
              fetchPriority="high"
              decoding="sync"
              style={{ backgroundColor: d.dominant }}
            />
          </picture>
        ) : (
          // запасной вариант, если обработанного фото нет: темная заглушка без стоковых изображений
          <div className="hero__placeholder" role="img" aria-label={t("imageAlt")} />
        )}
        <div className="hero__scrim" aria-hidden="true" />
        <div className="hero__tint" aria-hidden="true" />
      </div>

      <div className="container-x hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow hero__anim" style={{ ["--i" as string]: 0 }}>
            {t("eyebrow")}
          </p>
          <h1 id="hero-title" className="hero__title">
            <span className="hero__anim" style={{ ["--i" as string]: 1 }}>
              {t("h1a")}
            </span>
            <span className="hero__anim" style={{ ["--i" as string]: 2 }}>
              {t("h1b")}
            </span>
            <span className="hero__anim accent" style={{ ["--i" as string]: 3 }}>
              {t("h1c")}
            </span>
          </h1>
          <p className="hero__sub hero__anim" style={{ ["--i" as string]: 4 }}>
            {t("subtitle")}
          </p>
          <div className="hero__cta hero__anim" style={{ ["--i" as string]: 5 }}>
            <Link href={{ pathname: "/", hash: "calculator" }} className="btn btn-gold btn-lg">
              {t("primaryCta")}
              <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </Link>
            <Link href={{ pathname: "/", hash: "works" }} className="btn btn-outline-light btn-lg">
              {t("secondaryCta")}
            </Link>
          </div>
          <a
            className="hero__trust hero__anim"
            style={{ ["--i" as string]: 6 }}
            href={site.twoGis}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("ratingAria")}
          >
            <Star size={20} weight="fill" aria-hidden="true" className="hero__star" />
            <span>{t("ratingLine", { rating: site.rating.value.toFixed(1), count: site.rating.count })}</span>
          </a>
        </div>

        <ul className="hero__badges" role="list">
          <li className="glass-badge" style={{ ["--i" as string]: 0 }}>
            <ClipboardText size={22} weight="regular" aria-hidden="true" />
            {t("badge1")}
          </li>
          <li className="glass-badge" style={{ ["--i" as string]: 1 }}>
            <ShieldCheck size={22} weight="regular" aria-hidden="true" />
            {t("badge2")}
          </li>
          <li className="glass-badge" style={{ ["--i" as string]: 2 }}>
            <Ruler size={22} weight="regular" aria-hidden="true" />
            {t("badge3")}
          </li>
        </ul>
      </div>
    </section>
  );
}
