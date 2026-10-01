import { getTranslations } from "next-intl/server";
import { CountUp } from "@/components/ui/CountUp";
import { site } from "@config/site";

const IDS = ["1", "2", "3", "4", "5", "6"] as const;

/**
 * "Почему выбирают RUH" (ТЗ 6.5): темная секция, плашка цифр и шесть причин.
 * В плашке только подтвержденные числа: рейтинг 2ГИС (5.0, 23 оценки), 5 направлений работ и 6 шагов
 * (последние два взяты из текстов клиента; шаги надо утвердить: TODO_CLIENT). Выдуманных цифр нет.
 */
export async function Why() {
  const t = await getTranslations("why");
  const cells = [
    { n: site.rating.value, d: 1, label: t("stats.rating", { count: site.rating.count }) },
    { n: 5, d: 0, label: t("stats.directions") },
    { n: 6, d: 0, label: t("stats.steps") },
  ];
  return (
    <section id="why" className="section band-dark on-dark why" aria-labelledby="why-title">
      <div className="container-x">
        <ul className="stats" role="list" data-reveal>
          {cells.map((c) => (
            <li key={c.label} className="stats__cell">
              <CountUp to={c.n} decimals={c.d} className="stats__num tnum" />
              <span className="stats__label">{c.label}</span>
            </li>
          ))}
        </ul>

        <div className="section-head why__head" data-reveal>
          <h2 id="why-title" className="h2">
            {t("title")}
          </h2>
        </div>

        <ol className="reasons" role="list">
          {IDS.map((id, i) => (
            <li key={id} className="reason" data-reveal style={{ ["--i" as string]: i % 2 }}>
              <span className="reason__num tnum" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="reason__title">{t(`items.${id}.title`)}</h3>
              <p className="reason__text">{t(`items.${id}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
