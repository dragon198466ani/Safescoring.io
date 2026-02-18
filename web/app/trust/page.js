"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useStats } from "@/hooks/useStats";
import config from "@/config";
import NotAPonzi from "@/components/NotAPonzi";
import {
  detectLanguage,
  getTranslations,
  translate,
  defaultLanguage,
} from "@/libs/i18n";

/**
 * Trust & Transparency Page
 * Centralizes all trust signals to prove SafeScoring is legitimate
 */

const TRUST_SECTIONS = {
  identity: {
    titleKey: "trust.sections.identity.title",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
  },
  methodology: {
    titleKey: "trust.sections.methodology.title",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  blockchain: {
    titleKey: "trust.sections.blockchain.title",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  business: {
    titleKey: "trust.sections.business.title",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
};

function TrustBadge({ label, value, color = "primary" }) {
  const colorClasses = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  };

  return (
    <div className={`p-4 rounded-xl border text-center ${colorClasses[color]}`}>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function VerifiedItem({ label, value, verified = true, link }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-base-300 last:border-0">
      <span className="text-base-content/70">{label}</span>
      <div className="flex items-center gap-2">
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <span className="font-medium">{value}</span>
        )}
        {verified && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-500">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default function TrustPage() {
  const { stats, loading } = useStats();
  const [lang, setLang] = useState(defaultLanguage);

  useEffect(() => {
    const detected = detectLanguage();
    if (detected) setLang(detected);
  }, []);

  const t = useMemo(() => {
    const translations = getTranslations(lang);
    return (key, params) => translate(translations, key, params);
  }, [lang]);

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16">
        {/* Hero */}
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500 text-sm font-medium mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {t("trust.hero.badge")}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              {t("trust.hero.title")} <span className="text-gradient-safe">{t("trust.hero.titleHighlight")}</span>
            </h1>
            <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
              {t("trust.hero.subtitle")}
            </p>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="px-6 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TrustBadge
                label={t("trust.stats.norms")}
                value={loading ? "..." : stats.totalNorms}
                color="primary"
              />
              <TrustBadge
                label={t("trust.stats.products")}
                value={loading ? "..." : `${stats.totalProducts}+`}
                color="green"
              />
              <TrustBadge
                label={t("trust.stats.proofs")}
                value="52+"
                color="blue"
              />
              <TrustBadge
                label={t("trust.stats.days")}
                value="30+"
                color="purple"
              />
            </div>
          </div>
        </section>

        {/* What SafeScoring is NOT */}
        <section className="py-12 px-6 bg-base-200/30">
          <div className="max-w-5xl mx-auto">
            <NotAPonzi />
          </div>
        </section>

        {/* Main Trust Sections */}
        <section className="py-12 px-6">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Identity & Legal */}
            <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
              <div className="p-6 border-b border-base-300 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  {TRUST_SECTIONS.identity.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t(TRUST_SECTIONS.identity.titleKey)}</h2>
                  <p className="text-sm text-base-content/60">{t("trust.identity.subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                <VerifiedItem label={t("trust.identity.items.companyName")} value={config.company.name} />
                <VerifiedItem label={t("trust.identity.items.legalForm")} value={`${config.company.legalForm} (${config.company.state})`} />
                <VerifiedItem label={t("trust.identity.items.country")} value={config.company.country} />
                <VerifiedItem label={t("trust.identity.items.formation")} value={t("trust.identity.values.formation", { year: "2024" })} />
                <VerifiedItem label={t("trust.identity.items.contactEmail")} value={config.company.email} link={`mailto:${config.company.email}`} />
                <VerifiedItem label={t("trust.identity.items.supportEmail")} value={config.resend.supportEmail} link={`mailto:${config.resend.supportEmail}`} />
                <VerifiedItem label={t("trust.identity.items.domainAge")} value={t("trust.identity.values.domainAge", { year: "2024" })} />
                <VerifiedItem label={t("trust.identity.items.team")} value={t("trust.identity.values.team")} verified={true} />
                <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-base-content/70">
                    <strong className="text-primary">{t("trust.identity.pseudo.title")}</strong>{" "}
                    {t("trust.identity.pseudo.body")}
                  </p>
                </div>
              </div>
            </div>

            {/* Methodology Transparency */}
            <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
              <div className="p-6 border-b border-base-300 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                  {TRUST_SECTIONS.methodology.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t(TRUST_SECTIONS.methodology.titleKey)}</h2>
                  <p className="text-sm text-base-content/60">{t("trust.methodology.subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">{t("trust.methodology.publish.title")}</h3>
                    <ul className="space-y-2">
                      {[
                        t("trust.methodology.publish.norms", { count: loading ? "2354" : stats.totalNorms }),
                        t("trust.methodology.publish.pillars"),
                        t("trust.methodology.publish.weighting"),
                        t("trust.methodology.publish.classifications"),
                        t("trust.methodology.publish.criteria"),
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          <span className="text-base-content/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">{t("trust.methodology.proprietary.title")}</h3>
                    <p className="text-sm text-base-content/70 mb-3">
                      {t("trust.methodology.proprietary.p1Start")} <strong>{t("trust.methodology.proprietary.methodology")}</strong>{" "}
                      {t("trust.methodology.proprietary.p1Middle")} <strong>{t("trust.methodology.proprietary.implementation")}</strong>{" "}
                      {t("trust.methodology.proprietary.p1End")}
                    </p>
                    <p className="text-sm text-base-content/70">
                      {t("trust.methodology.proprietary.p2")}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/methodology" className="btn btn-primary btn-sm">
                    {t("trust.methodology.ctaPrimary")}
                  </Link>
                  <Link href="/api-docs" className="btn btn-ghost btn-sm">
                    {t("trust.methodology.ctaSecondary")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Blockchain Proofs */}
            <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
              <div className="p-6 border-b border-base-300 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                  {TRUST_SECTIONS.blockchain.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t(TRUST_SECTIONS.blockchain.titleKey)}</h2>
                  <p className="text-sm text-base-content/60">{t("trust.blockchain.subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                    <div className="text-2xl font-bold text-blue-400">{t("trust.blockchain.stats.networkValue")}</div>
                    <div className="text-xs text-base-content/60">{t("trust.blockchain.stats.networkLabel")}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                    <div className="text-2xl font-bold text-blue-400">{t("trust.blockchain.stats.hashValue")}</div>
                    <div className="text-xs text-base-content/60">{t("trust.blockchain.stats.hashLabel")}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-base-200/50 border border-base-300 text-center">
                    <div className="text-2xl font-bold text-blue-400">{t("trust.blockchain.stats.commitValue")}</div>
                    <div className="text-xs text-base-content/60">{t("trust.blockchain.stats.commitLabel")}</div>
                  </div>
                </div>
                <p className="text-sm text-base-content/70 mb-4">
                  {t("trust.blockchain.body")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/proof" className="btn btn-primary btn-sm">
                    {t("trust.blockchain.ctaPrimary")}
                  </Link>
                  <a
                    href="https://polygonscan.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                  >
                    {t("trust.blockchain.ctaSecondary")}
                  </a>
                </div>
              </div>
            </div>

            {/* Business Model */}
            <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
              <div className="p-6 border-b border-base-300 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  {TRUST_SECTIONS.business.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t(TRUST_SECTIONS.business.titleKey)}</h2>
                  <p className="text-sm text-base-content/60">{t("trust.business.subtitle")}</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3 text-green-400">{t("trust.business.revenue.title")}</h3>
                    <ul className="space-y-2">
                      {[
                        t("trust.business.revenue.items.subscriptions"),
                        t("trust.business.revenue.items.api"),
                        t("trust.business.revenue.items.enterprise"),
                        t("trust.business.revenue.items.affiliate"),
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          <span className="text-base-content/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-red-400">{t("trust.business.no.title")}</h3>
                    <ul className="space-y-2">
                      {[
                        t("trust.business.no.items.tokens"),
                        t("trust.business.no.items.yield"),
                        t("trust.business.no.items.rankings"),
                        t("trust.business.no.items.fees"),
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-base-content/80">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-6">
                  <Link href="/#pricing" className="btn btn-primary btn-sm">
                    {t("trust.business.cta")}
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* External Validation */}
        <section className="py-12 px-6 bg-base-200/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">{t("trust.validation.title")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-base-100 rounded-xl p-6 border border-base-300 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">{t("trust.validation.standards.title")}</h3>
                <p className="text-sm text-base-content/60">
                  {t("trust.validation.standards.desc")}
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">{t("trust.validation.payments.title")}</h3>
                <p className="text-sm text-base-content/60">
                  {t("trust.validation.payments.desc")}
                </p>
              </div>
              <div className="bg-base-100 rounded-xl p-6 border border-base-300 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">{t("trust.validation.hosted.title")}</h3>
                <p className="text-sm text-base-content/60">
                  {t("trust.validation.hosted.desc")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">{t("trust.cta.title")}</h2>
            <p className="text-base-content/60 mb-8">
              {t("trust.cta.body")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={`mailto:${config.company.email}`} className="btn btn-primary">
                {t("trust.cta.primary")}
              </a>
              <Link href="/methodology" className="btn btn-ghost">
                {t("trust.cta.secondary")}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
