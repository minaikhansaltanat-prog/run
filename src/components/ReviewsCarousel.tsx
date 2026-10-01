"use client";
// Карусель отзывов: scroll-snap, стрелки, свайп (родной), точки. Работает внутри блока и не двигает страницу.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretLeft, CaretRight, Star } from "@phosphor-icons/react";

export interface ReviewItem {
  id: string;
  author: string;
  initials: string;
  text: string;
  rating: number;
}

export function ReviewsCarousel({ items }: { items: ReviewItem[] }) {
  const t = useTranslations("reviews");
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(cards.indexOf(e.target as HTMLElement));
        }
      },
      { root: track, threshold: [0.6] },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length]);

  const go = useCallback(
    (i: number) => {
      const track = trackRef.current;
      const card = track?.children[Math.max(0, Math.min(items.length - 1, i))] as HTMLElement | undefined;
      if (!track || !card) return;
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    },
    [items.length],
  );

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={t("carouselLabel")}>
      <ul ref={trackRef} className="carousel__track" role="list">
        {items.map((r) => (
          <li key={r.id} className="review-card" aria-label={r.author}>
            <p className="review-card__stars" role="img" aria-label={t("stars", { n: r.rating })}>
              {Array.from({ length: r.rating }).map((_, i) => (
                <Star key={i} size={18} weight="fill" aria-hidden="true" />
              ))}
            </p>
            <blockquote className="review-card__text">{r.text}</blockquote>
            <div className="review-card__who">
              <span className="review-card__avatar" aria-hidden="true">
                {r.initials}
              </span>
              <span>
                <strong>{r.author}</strong>
                <small>{t("source")}</small>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="carousel__nav">
        <button type="button" className="carousel__btn" onClick={() => go(active - 1)} aria-label={t("prev")} disabled={active === 0}>
          <CaretLeft size={20} weight="bold" aria-hidden="true" />
        </button>
        <div className="carousel__dots" role="group">
          {items.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="carousel__dot"
              aria-label={t("goTo", { n: i + 1 })}
              aria-current={i === active ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className="carousel__btn" onClick={() => go(active + 1)} aria-label={t("next")} disabled={active === items.length - 1}>
          <CaretRight size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
