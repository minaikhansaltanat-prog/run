import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="page-top">
      <section className="section not-found">
        <div className="container-x">
          <div className="not-found__wrap">
            <p className="not-found__code tnum" aria-hidden="true">
              404
            </p>
            <h1 className="h2">{t("title")}</h1>
            <p className="lead">{t("text")}</p>
            <Link href="/" className="btn btn-gold btn-lg">
              {t("home")}
              <ArrowRight size={20} weight="bold" aria-hidden="true" className="btn-icon btn-icon-arrow" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
