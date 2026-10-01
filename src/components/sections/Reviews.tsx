import { getTranslations } from "next-intl/server";
import { ArrowUpRight, CheckCircle, Star } from "@phosphor-icons/react/dist/ssr";
import { ReviewsCarousel, type ReviewItem } from "@/components/ReviewsCarousel";
import { ClientMessages } from "@/components/ClientMessages";
import reviewsJson from "@content/reviews.json";
import { site } from "@config/site";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/**
 * "Отзывы" (ТЗ 6.8): слева бейдж рейтинга 2ГИС, справа карусель отзывов с инициалами (не фото).
 * Реальных текстов отзывов клиент пока не дал и разрешения авторов нет, поэтому отзывы не сочиняются:
 * вместо карусели показываем темы, которые клиенты отмечают на 2ГИС (TODO_CLIENT: добавить отзывы в content/reviews.json).
 */
export async function Reviews() {
  const t = await getTranslations("reviews");
  const items: ReviewItem[] = (reviewsJson.items as { author: string; text: string; rating?: number }[]).map((r, i) => ({
    id: String(i),
    author: r.author,
    initials: initials(r.author),
    text: r.text,
    rating: r.rating ?? 5,
  }));

  return (
    <section id="reviews" className="section bg-paper reviews" aria-labelledby="reviews-title">
      <div className="container-x reviews__grid">
        <div className="reviews__badge-col" data-reveal>
          <h2 id="reviews-title" className="h2">
            {t("title")}
          </h2>
          <div className="rating-card">
            <p className="rating-card__label">{t("badgeLabel")}</p>
            <p className="rating-card__value tnum">{site.rating.value.toFixed(1)}</p>
            <p className="rating-card__stars" role="img" aria-label={t("stars", { n: 5 })}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={22} weight="fill" aria-hidden="true" />
              ))}
            </p>
            <p className="rating-card__meta">{t("badge", { count: site.rating.count })}</p>
            <a className="btn btn-dark btn-sm" href={site.twoGis} target="_blank" rel="noopener noreferrer">
              {t("link")}
              <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="reviews__body" data-reveal style={{ ["--i" as string]: 1 }}>
          {items.length > 0 ? (
            <ClientMessages namespaces={["reviews"]}>
              <ReviewsCarousel items={items} />
            </ClientMessages>
          ) : (
            <>
              <h3 className="reviews__themes-title">{t("themesTitle")}</h3>
              <ul className="themes" role="list">
                {(["1", "2", "3", "4"] as const).map((k) => (
                  <li key={k} className="theme-card">
                    <CheckCircle size={26} weight="fill" aria-hidden="true" className="theme-card__icon" />
                    <span>{t(`themes.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
