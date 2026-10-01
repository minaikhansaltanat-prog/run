import { getTranslations } from "next-intl/server";
import { FaqList } from "@/components/FaqList";

const IDS = ["1", "2", "3", "4", "5"] as const;

/** FAQ (ТЗ 6.10): 5 вопросов, раскрывающиеся пункты, доступны с клавиатуры. Разметка FAQPage для поиска. */
export async function Faq() {
  const t = await getTranslations("faq");
  const items = IDS.map((id) => ({ id, q: t(`items.${id}.q`), a: t(`items.${id}.a`) }));
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="container-x">
        <div className="faq__wrap">
          <h2 id="faq-title" className="h2" data-reveal>
            {t("title")}
          </h2>
          <div data-reveal style={{ ["--i" as string]: 1 }}>
            <FaqList items={items} />
          </div>
        </div>
      </div>
    </section>
  );
}
