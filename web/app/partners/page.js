import Link from "next/link";
import { getT } from "@/libs/i18n/server";

export const metadata = {
  title: "Partners & Integrations | SafeScoring",
  description: "Partner with SafeScoring to integrate security ratings into your crypto product. API access, white-label solutions, and affiliate programs.",
  keywords: "crypto security partnership, SafeScoring integration, blockchain security API partner",
};

export default async function PartnersPage() {
  const t = await getT();

  const partnerTypes = [
    {
      title: t("partnersPage.walletProviders"),
      icon: "\uD83D\uDCBC",
      description: t("partnersPage.walletProvidersDesc"),
      benefits: [
        t("partnersPage.walletBenefit1"),
        t("partnersPage.walletBenefit2"),
        t("partnersPage.walletBenefit3"),
        t("partnersPage.walletBenefit4"),
      ],
      cta: t("partnersPage.walletCta"),
    },
    {
      title: t("partnersPage.exchangesPlatforms"),
      icon: "\uD83D\uDCCA",
      description: t("partnersPage.exchangesPlatformsDesc"),
      benefits: [
        t("partnersPage.exchangeBenefit1"),
        t("partnersPage.exchangeBenefit2"),
        t("partnersPage.exchangeBenefit3"),
        t("partnersPage.exchangeBenefit4"),
      ],
      cta: t("partnersPage.exchangeCta"),
    },
    {
      title: t("partnersPage.mediaResearch"),
      icon: "\uD83D\uDCF0",
      description: t("partnersPage.mediaResearchDesc"),
      benefits: [
        t("partnersPage.mediaBenefit1"),
        t("partnersPage.mediaBenefit2"),
        t("partnersPage.mediaBenefit3"),
        t("partnersPage.mediaBenefit4"),
      ],
      cta: t("partnersPage.mediaCta"),
    },
    {
      title: t("partnersPage.securityAuditors"),
      icon: "\uD83D\uDD12",
      description: t("partnersPage.securityAuditorsDesc"),
      benefits: [
        t("partnersPage.auditorBenefit1"),
        t("partnersPage.auditorBenefit2"),
        t("partnersPage.auditorBenefit3"),
        t("partnersPage.auditorBenefit4"),
      ],
      cta: t("partnersPage.auditorCta"),
    },
  ];

  const integrationOptions = [
    {
      name: t("partnersPage.apiAccess"),
      description: t("partnersPage.apiAccessDesc"),
      features: [t("partnersPage.apiFeature1"), t("partnersPage.apiFeature2"), t("partnersPage.apiFeature3")],
      link: "/api-docs",
    },
    {
      name: t("partnersPage.embeddableWidgets"),
      description: t("partnersPage.embeddableWidgetsDesc"),
      features: [t("partnersPage.widgetFeature1"), t("partnersPage.widgetFeature2"), t("partnersPage.widgetFeature3")],
      link: "/badge",
    },
    {
      name: t("partnersPage.webhooks"),
      description: t("partnersPage.webhooksDesc"),
      features: [t("partnersPage.webhookFeature1"), t("partnersPage.webhookFeature2"), t("partnersPage.webhookFeature3")],
      link: "/api-docs#webhooks",
    },
    {
      name: t("partnersPage.whiteLabel"),
      description: t("partnersPage.whiteLabelDesc"),
      features: [t("partnersPage.whiteLabelFeature1"), t("partnersPage.whiteLabelFeature2"), t("partnersPage.whiteLabelFeature3")],
      link: "mailto:partners@safescoring.io",
    },
  ];

  const affiliateFeatures = [
    t("partnersPage.affiliateFeature1"),
    t("partnersPage.affiliateFeature2"),
    t("partnersPage.affiliateFeature3"),
    t("partnersPage.affiliateFeature4"),
    t("partnersPage.affiliateFeature5"),
    t("partnersPage.affiliateFeature6"),
  ];

  return (
    <main className="min-h-screen bg-base-200">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/20 to-secondary/20 py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="badge badge-primary mb-4">{t("partnersPage.badge")}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("partnersPage.title")}
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              {t("partnersPage.subtitle")}
            </p>
            <div className="flex gap-4 justify-center">
              <a href="#become-partner" className="btn btn-primary">
                {t("partnersPage.becomePartner")}
              </a>
              <Link href="/api-docs" className="btn btn-outline">
                {t("partnersPage.viewApiDocs")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Types */}
      <section className="py-16 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">{t("partnersPage.partnerPrograms")}</h2>
          <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
            {t("partnersPage.partnerProgramsDesc")}
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {partnerTypes.map((partner, idx) => (
              <div key={idx} className="card bg-base-200 hover:shadow-xl transition-shadow">
                <div className="card-body">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-4xl">{partner.icon}</div>
                    <h3 className="card-title text-xl">{partner.title}</h3>
                  </div>

                  <p className="text-base-content/70 mb-4">{partner.description}</p>

                  <ul className="space-y-2 mb-6">
                    {partner.benefits.map((benefit, bIdx) => (
                      <li key={bIdx} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <div className="card-actions">
                    <a href="#become-partner" className="btn btn-primary btn-sm">
                      {partner.cta}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Options */}
      <section className="py-16 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">{t("partnersPage.integrationOptions")}</h2>
          <p className="text-center text-base-content/70 mb-12">
            {t("partnersPage.integrationOptionsDesc")}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {integrationOptions.map((option, idx) => (
              <div key={idx} className="card bg-base-100">
                <div className="card-body">
                  <h3 className="card-title text-lg">{option.name}</h3>
                  <p className="text-sm text-base-content/70 mb-4">{option.description}</p>

                  <ul className="space-y-1 mb-4">
                    {option.features.map((feature, fIdx) => (
                      <li key={fIdx} className="text-xs text-base-content/60">
                        {"\u2022"} {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="card-actions mt-auto">
                    <Link href={option.link} className="btn btn-ghost btn-sm w-full">
                      {t("partnersPage.learnMoreArrow")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Affiliate Program */}
      <section className="py-16 bg-base-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="badge badge-secondary mb-4">{t("partnersPage.affiliateBadge")}</div>
              <h2 className="text-3xl font-bold mb-4">{t("partnersPage.earnTitle")}</h2>
              <p className="text-base-content/70 mb-6">
                {t("partnersPage.earnDesc")}
              </p>

              <ul className="space-y-3 mb-8">
                {affiliateFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="badge badge-success badge-sm">{"\u2713"}</div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a href="#become-partner" className="btn btn-primary">
                {t("partnersPage.joinAffiliate")}
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="card bg-primary/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-primary">20%</div>
                  <div className="text-sm text-base-content/70">{t("partnersPage.commission")}</div>
                </div>
              </div>
              <div className="card bg-secondary/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-secondary">90 days</div>
                  <div className="text-sm text-base-content/70">{t("partnersPage.cookieDuration")}</div>
                </div>
              </div>
              <div className="card bg-accent/10 text-center">
                <div className="card-body">
                  <div className="text-4xl font-bold text-accent">Monthly</div>
                  <div className="text-sm text-base-content/70">{t("partnersPage.payouts")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Partners */}
      <section className="py-16 bg-base-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl font-bold text-center mb-8">{t("partnersPage.trustedBy")}</h2>

          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            <div className="text-2xl font-bold">DeFiSafety</div>
            <div className="text-2xl font-bold">CertiK</div>
            <div className="text-2xl font-bold">SlowMist</div>
            <div className="text-2xl font-bold">PeckShield</div>
            <div className="text-2xl font-bold">Hacken</div>
          </div>

          <p className="text-center text-sm text-base-content/50 mt-6">
            {t("partnersPage.trustedByNote")}
          </p>
        </div>
      </section>

      {/* CTA Form */}
      <section id="become-partner" className="py-16 bg-gradient-to-r from-primary/20 to-secondary/20">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl justify-center mb-6">
                {t("partnersPage.applyToPartner")}
              </h2>

              <form className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t("partnersPage.companyName")}</span>
                    </label>
                    <input type="text" className="input input-bordered" required />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t("partnersPage.website")}</span>
                    </label>
                    <input type="url" className="input input-bordered" placeholder="https://" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t("partnersPage.yourName")}</span>
                    </label>
                    <input type="text" className="input input-bordered" required />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">{t("partnersPage.email")}</span>
                    </label>
                    <input type="email" className="input input-bordered" required />
                  </div>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t("partnersPage.partnershipType")}</span>
                  </label>
                  <select className="select select-bordered">
                    <option>{t("partnersPage.optionApiIntegration")}</option>
                    <option>{t("partnersPage.optionAffiliate")}</option>
                    <option>{t("partnersPage.optionWhiteLabel")}</option>
                    <option>{t("partnersPage.optionMedia")}</option>
                    <option>{t("partnersPage.optionAuditor")}</option>
                    <option>{t("partnersPage.optionOther")}</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">{t("partnersPage.tellUsAbout")}</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder={t("partnersPage.formPlaceholder")}
                  ></textarea>
                </div>

                <button type="submit" className="btn btn-primary w-full">
                  {t("partnersPage.submitApplication")}
                </button>

                <p className="text-xs text-center text-base-content/50">
                  {t("partnersPage.responseTime")}
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
