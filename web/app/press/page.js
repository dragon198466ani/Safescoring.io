import Link from "next/link";
import { getNormStats } from "@/libs/getNormStats";
import { getT } from "@/libs/i18n/server";

export const metadata = {
  title: "Press Kit | SafeScoring",
  description: "Media resources, brand assets, and press information for SafeScoring - the crypto security rating platform.",
  keywords: "SafeScoring press kit, crypto security news, blockchain security media",
};

const pressReleases = [
  {
    date: "2025-01-15",
    title: "SafeScoring Launches Comprehensive Crypto Security Rating Platform",
    excerpt: "New platform evaluates 500+ crypto products across comprehensive security norms to help users make safer choices.",
  },
  {
    date: "2025-02-01",
    title: "SafeScoring Introduces Browser Extension for Real-Time Security Alerts",
    excerpt: "Chrome extension warns users about security risks while browsing crypto websites.",
  },
  {
    date: "2025-03-01",
    title: "SafeScoring Opens API for Developers and Partners",
    excerpt: "Free API enables wallets, portfolio trackers, and news sites to integrate security ratings.",
  },
];

export default async function PressPage() {
  const t = await getT();
  const normStats = await getNormStats();
  const totalNorms = normStats?.totalNorms ?? "\u2014";

  const mediaContacts = [
    { name: t("pressPage.contactPressInquiries"), email: "press@safescoring.io" },
    { name: t("pressPage.contactPartnership"), email: "partners@safescoring.io" },
    { name: t("pressPage.contactGeneral"), email: "hello@safescoring.io" },
  ];

  const stats = [
    { label: t("pressPage.productsRated"), value: "500+" },
    { label: t("pressPage.securityNorms"), value: `${totalNorms}` },
    { label: t("pressPage.productCategories"), value: "15+" },
    { label: t("pressPage.monthlyVisitors"), value: "10K+" },
  ];

  return (
    <main className="min-h-screen bg-base-200">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="badge badge-primary mb-4">{t("pressPage.badge")}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("pressPage.title")}
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
              {t("pressPage.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("pressPage.keyStatistics")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="card bg-base-200 text-center">
                <div className="card-body">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm text-base-content/70">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">{t("pressPage.aboutTitle")}</h2>
              <div className="prose prose-sm">
                <p>
                  {t("pressPage.aboutP1", { totalNorms })}
                </p>
                <p>
                  {t("pressPage.aboutP2")}
                </p>
                <p>
                  {t("pressPage.aboutP3")}
                </p>
                <ul>
                  <li><strong>S</strong>{t("pressPage.pillarS")}</li>
                  <li><strong>A</strong>{t("pressPage.pillarA")}</li>
                  <li><strong>F</strong>{t("pressPage.pillarF")}</li>
                  <li><strong>E</strong>{t("pressPage.pillarE")}</li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4">{t("pressPage.boilerplateTitle")}</h2>
              <div className="bg-base-100 rounded-lg p-6 border border-base-300">
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>{t("pressPage.boilerplateShort")}</strong><br />
                  {t("pressPage.boilerplateShortText", { totalNorms })}
                </p>
                <div className="divider"></div>
                <p className="text-sm text-base-content/80 leading-relaxed">
                  <strong>{t("pressPage.boilerplateTweet")}</strong><br />
                  {t("pressPage.boilerplateTweetText", { totalNorms })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Assets */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">{t("pressPage.brandAssets")}</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Logo */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">{t("pressPage.logo")}</h3>
                <div className="bg-base-300 rounded-lg p-8 flex items-center justify-center min-h-[120px]">
                  <div className="text-3xl font-bold">
                    <span className="text-primary">Safe</span>
                    <span>Scoring</span>
                  </div>
                </div>
                <div className="card-actions mt-4">
                  <button className="btn btn-sm btn-outline w-full">
                    {t("pressPage.downloadPng")}
                  </button>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">{t("pressPage.brandColors")}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#00d4aa]"></div>
                    <div>
                      <div className="font-mono text-sm">#00d4aa</div>
                      <div className="text-xs text-base-content/60">{t("pressPage.colorPrimarySafe")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#f59e0b]"></div>
                    <div>
                      <div className="font-mono text-sm">#f59e0b</div>
                      <div className="text-xs text-base-content/60">{t("pressPage.colorWarningCaution")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#ef4444]"></div>
                    <div>
                      <div className="font-mono text-sm">#ef4444</div>
                      <div className="text-xs text-base-content/60">{t("pressPage.colorDangerRisk")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#0f172a]"></div>
                    <div>
                      <div className="font-mono text-sm">#0f172a</div>
                      <div className="text-xs text-base-content/60">{t("pressPage.colorBackgroundDark")}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshots */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title text-lg">{t("pressPage.screenshots")}</h3>
                <p className="text-sm text-base-content/70 mb-4">
                  {t("pressPage.screenshotsDesc")}
                </p>
                <div className="card-actions">
                  <button className="btn btn-sm btn-outline w-full">
                    {t("pressPage.downloadAllZip")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Guidelines */}
          <div className="mt-8 p-6 bg-base-200 rounded-lg">
            <h3 className="font-bold mb-4">{t("pressPage.brandGuidelines")}</h3>
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div>
                <h4 className="font-semibold text-success mb-2">{t("pressPage.doTitle")}</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>{"\u2713"} {t("pressPage.doItem1")}</li>
                  <li>{"\u2713"} {t("pressPage.doItem2")}</li>
                  <li>{"\u2713"} {t("pressPage.doItem3")}</li>
                  <li>{"\u2713"} {t("pressPage.doItem4")}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-error mb-2">{t("pressPage.dontTitle")}</h4>
                <ul className="space-y-1 text-base-content/70">
                  <li>{"\u2717"} {t("pressPage.dontItem1")}</li>
                  <li>{"\u2717"} {t("pressPage.dontItem2")}</li>
                  <li>{"\u2717"} {t("pressPage.dontItem3")}</li>
                  <li>{"\u2717"} {t("pressPage.dontItem4")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-12 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">{t("pressPage.pressReleases")}</h2>

          <div className="space-y-4">
            {pressReleases.map((pr, idx) => (
              <div key={idx} className="card bg-base-100">
                <div className="card-body">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-base-content/60 mb-1">
                        {new Date(pr.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <h3 className="card-title text-lg">{pr.title}</h3>
                      <p className="text-sm text-base-content/70 mt-2">{pr.excerpt}</p>
                    </div>
                    <button className="btn btn-sm btn-ghost">{t("pressPage.readMore")}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="py-12 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold mb-8">{t("pressPage.featuredIn")}</h2>

          <div className="flex flex-wrap justify-center gap-8 opacity-50">
            <div className="text-2xl font-bold">CoinDesk</div>
            <div className="text-2xl font-bold">The Block</div>
            <div className="text-2xl font-bold">Decrypt</div>
            <div className="text-2xl font-bold">CoinTelegraph</div>
            <div className="text-2xl font-bold">Bankless</div>
          </div>

          <p className="text-center text-sm text-base-content/60 mt-4">
            {t("pressPage.featuredInNote")}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">{t("pressPage.mediaContact")}</h2>
          <p className="text-base-content/70 mb-8">
            {t("pressPage.mediaContactDesc")}
          </p>

          <div className="flex flex-wrap justify-center gap-6">
            {mediaContacts.map((contact, idx) => (
              <a
                key={idx}
                href={`mailto:${contact.email}`}
                className="card bg-base-100 hover:bg-base-200 transition-colors"
              >
                <div className="card-body py-4 px-6">
                  <div className="text-sm text-base-content/60">{contact.name}</div>
                  <div className="font-mono text-primary">{contact.email}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
