import { headers } from "next/headers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeeComparator from "@/components/FeeComparator";
import {
  getTranslations,
  translate,
  supportedLanguages,
  defaultLanguage,
} from "@/libs/i18n";

const getLangFromHeaders = () => {
  const acceptLanguage = headers().get("accept-language") || "";
  const first = acceptLanguage.split(",")[0]?.trim() || "";
  const code = first.split("-")[0]?.toLowerCase();
  return supportedLanguages.includes(code) ? code : defaultLanguage;
};

const getT = (lang) => {
  const translations = getTranslations(lang);
  return (key, params) => translate(translations, key, params);
};

export async function generateMetadata() {
  const lang = getLangFromHeaders();
  const t = getT(lang);
  return {
    title: t("feeCompare.meta.title"),
    description: t("feeCompare.meta.description"),
    keywords: t("feeCompare.meta.keywords"),
  };
}

export default function FeeComparatorPage() {
  const lang = getLangFromHeaders();
  const t = getT(lang);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-6 hero-bg">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {t("feeCompare.hero.title")}
            </h1>
            <p className="text-base-content/60 max-w-2xl mx-auto">
              {t("feeCompare.hero.subtitle")}
            </p>
          </div>

          {/* Fee Comparator */}
          <FeeComparator />

          {/* Additional info */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("feeCompare.info.maker.title")}</h3>
              <p className="text-sm text-base-content/60">
                {t("feeCompare.info.maker.body")}
              </p>
            </div>

            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-400">
                  <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.061l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.061 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.061 1.06l1.06 1.06z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("feeCompare.info.vip.title")}</h3>
              <p className="text-sm text-base-content/60">
                {t("feeCompare.info.vip.body")}
              </p>
            </div>

            <div className="rounded-xl bg-base-200 border border-base-300 p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("feeCompare.info.network.title")}</h3>
              <p className="text-sm text-base-content/60">
                {t("feeCompare.info.network.body")}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center">
            <h2 className="text-xl font-bold mb-2">{t("feeCompare.cta.title")}</h2>
            <p className="text-base-content/60 mb-6">
              {t("feeCompare.cta.subtitle")}
            </p>
            <a href="/products?type=exchange" className="btn btn-primary">
              {t("feeCompare.cta.button")}
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
