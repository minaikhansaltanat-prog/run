import { getTranslations } from "next-intl/server";
import { ClipboardText, FileText, Hammer, Key, Package, Ruler } from "@phosphor-icons/react/dist/ssr";

const STEPS = [
  { id: "1", Icon: ClipboardText },
  { id: "2", Icon: Ruler },
  { id: "3", Icon: FileText },
  { id: "4", Icon: Package },
  { id: "5", Icon: Hammer },
  { id: "6", Icon: Key },
] as const;

/**
 * "Как мы работаем" (ТЗ 6.6): горизонтальная линия времени (на телефоне вертикальная).
 * Линия оформлена как размерная линия чертежа: засечки на каждом шаге, рисуется при появлении.
 * TODO_CLIENT: шаги согласовать с клиентом.
 */
export async function Process() {
  const t = await getTranslations("process");
  return (
    <section id="process" className="section process" aria-labelledby="process-title">
      <div className="container-x">
        <div className="section-head" data-reveal>
          <h2 id="process-title" className="h2">
            {t("title")}
          </h2>
          <p className="lead">{t("subtitle")}</p>
        </div>

        <ol className="timeline" role="list" data-reveal style={{ ["--i" as string]: 1 }}>
          <span className="timeline__line" aria-hidden="true" />
          {STEPS.map(({ id, Icon }, i) => (
            <li key={id} className="timeline__step" style={{ ["--i" as string]: i }}>
              <span className="timeline__tick" aria-hidden="true" />
              <span className="timeline__label tnum">{t("stepLabel", { n: id })}</span>
              <span className="icon-plate timeline__icon" aria-hidden="true">
                <Icon size={26} weight="regular" />
              </span>
              <h3 className="timeline__title">{t(`steps.${id}.title`)}</h3>
              <p className="timeline__text">{t(`steps.${id}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
