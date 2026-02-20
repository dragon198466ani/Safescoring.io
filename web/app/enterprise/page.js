"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStats } from "@/hooks/useStats";
import {
  detectLanguage,
  getTranslations,
  translate,
  defaultLanguage,
} from "@/libs/i18n";

const useCases = [
  { icon: "🏦", key: "treasury" },
  { icon: "📊", key: "funds" },
  { icon: "🔐", key: "security" },
  { icon: "⚖️", key: "compliance" },
];

const features = [
  {
    key: "onboarding",
    included: ["Enterprise"],
  },
  {
    key: "prioritySupport",
    included: ["Enterprise"],
  },
  {
    key: "customEval",
    included: ["Enterprise"],
  },
  {
    key: "complianceReports",
    included: ["Enterprise"],
  },
  {
    key: "teamRoles",
    included: ["Enterprise"],
  },
  {
    key: "sso",
    included: ["Enterprise"],
  },
  {
    key: "unlimitedApi",
    included: ["Professional", "Enterprise"],
  },
  {
    key: "unlimitedAll",
    included: ["Enterprise"],
  },
];

const comparisonData = [
  { key: "productsAnalyzed", free: "10/month", explorer: "50/month", pro: "200/month", enterprise: "Unlimited" },
  { key: "setups", free: "1", explorer: "5", pro: "20", enterprise: "Unlimited" },
  { key: "teamMembers", free: "1", explorer: "1", pro: "3", enterprise: "Unlimited" },
  { key: "apiCalls", free: "-", explorer: "-", pro: "1,000/mo", enterprise: "50,000/mo" },
  { key: "pdfExports", free: "-", explorer: "5/mo", pro: "50/mo", enterprise: "Unlimited" },
  { key: "customEvaluations", free: "-", explorer: "-", pro: "-", enterprise: "5/mo included" },
  { key: "support", free: "Community", explorer: "Email", pro: "Priority", enterprise: "Priority <4h + Slack" },
  { key: "onboarding", free: "-", explorer: "-", pro: "-", enterprise: "Dedicated call" },
  { key: "sso", free: "-", explorer: "-", pro: "-", enterprise: "On request" },
];

export default function EnterprisePage() {
  const [showComparison, setShowComparison] = useState(false);
  const { stats } = useStats();
  const [lang, setLang] = useState(defaultLanguage);

  useEffect(() => {
    const detected = detectLanguage();
    if (detected) setLang(detected);
  }, []);

  const t = useMemo(() => {
    const translations = getTranslations(lang);
    return (key, params) => translate(translations, key, params);
  }, [lang]);

  const planLabel = (plan) => {
    const key = plan.toLowerCase();
    if (key === "free") return t("enterprise.pricing.table.free");
    if (key === "explorer") return t("enterprise.pricing.table.explorer");
    if (key === "professional") return t("enterprise.pricing.table.pro");
    if (key === "enterprise") return t("enterprise.pricing.table.enterprise");
    return plan;
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full text-amber-500 text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              {t("enterprise.hero.badge")}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t("enterprise.hero.title")}{" "}
              <span className="text-primary">{t("enterprise.hero.titleHighlight")}</span>
            </h1>
            <p className="text-xl text-base-content/70 max-w-2xl mx-auto mb-8">
              {t("enterprise.hero.subtitle", { products: stats.totalProducts, norms: stats.totalNorms })}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact?type=enterprise" className="btn btn-primary btn-lg">
                {t("enterprise.hero.ctaPrimary")}
              </Link>
              <Link href="/dashboard" className="btn btn-outline btn-lg">
                {t("enterprise.hero.ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-base-content/40 text-sm">
            <span>{t("enterprise.trust.title")}</span>
            <div className="flex items-center gap-8">
              <span className="font-semibold text-base-content/60">{t("enterprise.trust.dao")}</span>
              <span className="font-semibold text-base-content/60">{t("enterprise.trust.family")}</span>
              <span className="font-semibold text-base-content/60">{t("enterprise.trust.funds")}</span>
            </div>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold mb-6">{t("enterprise.problem.title")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="text-3xl mb-3">87%</div>
                <p className="text-base-content/70">{t("enterprise.problem.cards.audits")}</p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="text-3xl mb-3">$3.8B</div>
                <p className="text-base-content/70">{t("enterprise.problem.cards.losses")}</p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300">
                <div className="text-3xl mb-3">100+</div>
                <p className="text-base-content/70">{t("enterprise.problem.cards.diligence")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <h2 className="text-2xl font-bold text-center mb-12">{t("enterprise.useCases.title")}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((uc, i) => (
              <div key={i} className="bg-base-200 rounded-xl p-6 border border-base-300 hover:border-primary/50 transition-colors">
                <div className="text-3xl mb-4">{uc.icon}</div>
                <h3 className="font-semibold mb-2">{t(`enterprise.useCases.${uc.key}.title`)}</h3>
                <p className="text-sm text-base-content/70">{t(`enterprise.useCases.${uc.key}.desc`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SAFE Methodology */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold mb-4">{t("enterprise.methodology.title")}</h2>
              <p className="text-base-content/70">{t("enterprise.methodology.subtitle", { norms: stats.totalNorms })}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-base-100 rounded-xl p-6 border-t-4 border-t-blue-500">
                <h3 className="font-bold text-blue-500 mb-2">{t("pillars.security")}</h3>
                <p className="text-sm text-base-content/70">{t("enterprise.methodology.securityDesc")}</p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border-t-4 border-t-red-500">
                <h3 className="font-bold text-red-500 mb-2">{t("pillars.adversity")}</h3>
                <p className="text-sm text-base-content/70">{t("enterprise.methodology.adversityDesc")}</p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border-t-4 border-t-green-500">
                <h3 className="font-bold text-green-500 mb-2">{t("pillars.fidelity")}</h3>
                <p className="text-sm text-base-content/70">{t("enterprise.methodology.fidelityDesc")}</p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border-t-4 border-t-purple-500">
                <h3 className="font-bold text-purple-500 mb-2">{t("pillars.efficiency")}</h3>
                <p className="text-sm text-base-content/70">{t("enterprise.methodology.efficiencyDesc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise Features */}
        <section className="max-w-6xl mx-auto px-6 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-4">{t("enterprise.features.title")}</h2>
            <p className="text-base-content/70">{t("enterprise.features.subtitle")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-base-200 rounded-xl p-6 border border-base-300">
                <h3 className="font-semibold mb-2">{t(`enterprise.features.items.${f.key}.title`)}</h3>
                <p className="text-sm text-base-content/70 mb-3">{t(`enterprise.features.items.${f.key}.desc`)}</p>
                <div className="flex flex-wrap gap-1">
                  {f.included.map((plan) => (
                    <span
                      key={plan}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        plan === "Enterprise" ? "bg-amber-500/20 text-amber-500" : "bg-base-300 text-base-content/60"
                      }`}
                    >
                      {planLabel(plan)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Comparison */}
        <section className="bg-base-200 py-16 mb-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">{t("enterprise.pricing.title")}</h2>
              <div className="flex items-end justify-center gap-2 mb-2">
                <span className="text-5xl font-bold">$499</span>
                <span className="text-base-content/60 mb-2">{t("enterprise.pricing.perMonth")}</span>
              </div>
              <p className="text-base-content/70">{t("enterprise.pricing.note")}</p>
            </div>

            <button
              onClick={() => setShowComparison(!showComparison)}
              className="btn btn-outline btn-sm mx-auto flex mb-6"
            >
              {showComparison ? t("enterprise.pricing.hideComparison") : t("enterprise.pricing.showComparison")}
            </button>

            {showComparison && (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>{t("enterprise.pricing.table.feature")}</th>
                      <th className="text-center">{t("enterprise.pricing.table.free")}</th>
                      <th className="text-center">{t("enterprise.pricing.table.explorer")}</th>
                      <th className="text-center">{t("enterprise.pricing.table.pro")}</th>
                      <th className="text-center bg-amber-500/10">{t("enterprise.pricing.table.enterprise")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i}>
                        <td className="font-medium">{t(`enterprise.pricing.features.${row.key}`)}</td>
                        <td className="text-center text-base-content/60">{row.free}</td>
                        <td className="text-center text-base-content/60">{row.explorer}</td>
                        <td className="text-center text-base-content/60">{row.pro}</td>
                        <td className="text-center font-medium bg-amber-500/5">{row.enterprise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <Link href="/contact?type=enterprise" className="btn btn-primary btn-lg">
                {t("enterprise.pricing.ctaPrimary")}
              </Link>
              <Link href="/pricing" className="btn btn-outline">
                {t("enterprise.pricing.ctaSecondary")}
              </Link>
            </div>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-2xl font-bold text-center mb-12">{t("enterprise.compliance.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("enterprise.compliance.soc2.title")}</h3>
              <p className="text-sm text-base-content/70">{t("enterprise.compliance.soc2.desc")}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("enterprise.compliance.gdpr.title")}</h3>
              <p className="text-sm text-base-content/70">{t("enterprise.compliance.gdpr.desc")}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{t("enterprise.compliance.audit.title")}</h3>
              <p className="text-sm text-base-content/70">{t("enterprise.compliance.audit.desc")}</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-r from-amber-500/20 to-base-200 rounded-2xl p-8 md:p-12 text-center border border-amber-500/20">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("enterprise.cta.title")}</h2>
            <p className="text-base-content/70 mb-8 max-w-xl mx-auto">
              {t("enterprise.cta.body")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact?type=enterprise" className="btn btn-primary btn-lg">
                {t("enterprise.cta.primary")}
              </Link>
              <Link href="/products" className="btn btn-outline btn-lg">
                {t("enterprise.cta.secondary")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
