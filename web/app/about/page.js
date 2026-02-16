import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import config from "@/config";
import { getNormStats } from "@/libs/getNormStats";
import { getT } from "@/libs/i18n/server";

export const metadata = {
  title: `About ${config.appName} - Our Mission`,
  description:
    "Learn about SafeScoring's mission to bring transparency and objectivity to crypto security ratings.",
};

export default async function AboutPage() {
  const normStats = await getNormStats();
  const t = await getT();

  const values = [
    {
      title: t("aboutPage.independence"),
      description: t("aboutPage.independenceDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
    },
    {
      title: t("aboutPage.transparency"),
      description: t("aboutPage.transparencyDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: t("aboutPage.rigor"),
      description: t("aboutPage.rigorDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
    {
      title: t("aboutPage.accessibility"),
      description: t("aboutPage.accessibilityDesc"),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24">
        {/* Hero section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-primary/10 text-primary">
              {t("aboutPage.mission")}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t("aboutPage.title", { highlight: "" })}{" "}
              <span className="text-gradient-safe">{t("aboutPage.titleHighlight")}</span>
            </h1>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              {t("aboutPage.subtitle")}
            </p>
          </div>
        </section>

        {/* The Problem section */}
        <section className="py-16 px-6 bg-base-200/30">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {t("aboutPage.problemTitle")}
                </h2>
                <p className="text-base-content/70 mb-4">
                  {t("aboutPage.problemP1")}
                </p>
                <p className="text-base-content/70 mb-4">
                  {t("aboutPage.problemP2")}
                </p>
                <p className="text-base-content/70">
                  {t("aboutPage.problemP3")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <div className="text-3xl font-bold text-primary mb-1">{normStats?.totalNorms ?? "—"}</div>
                  <div className="text-sm text-base-content/60">{t("aboutPage.securityNorms")}</div>
                </div>
                <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">4</div>
                  <div className="text-sm text-base-content/60">{t("aboutPage.safePillars")}</div>
                </div>
                <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">{normStats?.totalProductTypes ?? "—"}</div>
                  <div className="text-sm text-base-content/60">{t("aboutPage.productTypes")}</div>
                </div>
                <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">1</div>
                  <div className="text-sm text-base-content/60">{t("aboutPage.unifiedFramework")}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values section */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("aboutPage.valuesTitle")}</h2>
              <p className="text-base-content/70">
                {t("aboutPage.valuesSubtitle")}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl bg-base-200/50 border border-base-300 hover:border-primary/30 transition-colors"
                >
                  <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary mb-4">
                    {value.icon}
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-base-content/60">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-20 px-6 bg-base-200/30">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {t("aboutPage.ctaTitle")}
            </h2>
            <p className="text-base-content/70 mb-8">
              {t("aboutPage.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/products" className="btn btn-primary">
                {t("aboutPage.exploreProducts")}
              </Link>
              <Link href="/#pillars" className="btn btn-ghost">
                {t("aboutPage.learnMethodology")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
