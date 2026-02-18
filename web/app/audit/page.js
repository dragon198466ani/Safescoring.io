"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  detectLanguage,
  getTranslations,
  translate,
  defaultLanguage,
} from "@/libs/i18n";

/**
 * DeFi Audit Request Page
 *
 * Revenue target: 1k/day
 * - Express: $500
 * - Standard: $1000
 * - Premium: $2000
 */

const AUDIT_TIERS = [
  {
    id: "express",
    price: 500,
    turnaround: "24h",
    nameKey: "audit.tiers.express.name",
    descriptionKey: "audit.tiers.express.desc",
    features: [
      "audit.tiers.express.features.score",
      "audit.tiers.express.features.breakdown",
      "audit.tiers.express.features.pdf",
      "audit.tiers.express.features.delivery",
    ],
    idealKey: "audit.tiers.express.ideal",
  },
  {
    id: "standard",
    price: 1000,
    turnaround: "48h",
    nameKey: "audit.tiers.standard.name",
    descriptionKey: "audit.tiers.standard.desc",
    features: [
      "audit.tiers.standard.features.everythingExpress",
      "audit.tiers.standard.features.pillar",
      "audit.tiers.standard.features.competitor",
      "audit.tiers.standard.features.roadmap",
      "audit.tiers.standard.features.brandedPdf",
    ],
    idealKey: "audit.tiers.standard.ideal",
    popular: true,
  },
  {
    id: "premium",
    price: 2000,
    turnaround: "72h",
    nameKey: "audit.tiers.premium.name",
    descriptionKey: "audit.tiers.premium.desc",
    features: [
      "audit.tiers.premium.features.everythingStandard",
      "audit.tiers.premium.features.review",
      "audit.tiers.premium.features.architecture",
      "audit.tiers.premium.features.badge",
      "audit.tiers.premium.features.priority",
      "audit.tiers.premium.features.press",
      "audit.tiers.premium.features.support",
    ],
    idealKey: "audit.tiers.premium.ideal",
  },
];

const TESTIMONIALS = [
  {
    quoteKey: "audit.testimonials.first.quote",
    authorKey: "audit.testimonials.first.author",
    projectKey: "audit.testimonials.first.project",
  },
  {
    quoteKey: "audit.testimonials.second.quote",
    authorKey: "audit.testimonials.second.author",
    projectKey: "audit.testimonials.second.project",
  },
];

const FAQS = [
  { qKey: "audit.faq.difference.q", aKey: "audit.faq.difference.a" },
  { qKey: "audit.faq.provide.q", aKey: "audit.faq.provide.a" },
  { qKey: "audit.faq.display.q", aKey: "audit.faq.display.a" },
  { qKey: "audit.faq.disagree.q", aKey: "audit.faq.disagree.a" },
];

export default function AuditPage() {
  const [selectedTier, setSelectedTier] = useState("standard");
  const [isUrgent, setIsUrgent] = useState(false);
  const [lang, setLang] = useState(defaultLanguage);
  const [formData, setFormData] = useState({
    project_name: "",
    project_url: "",
    project_type: "defi",
    email: "",
    description: "",
    telegram: "",
    twitter: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const detected = detectLanguage();
    if (detected) setLang(detected);
  }, []);

  const t = useMemo(() => {
    const translations = getTranslations(lang);
    return (key, params) => translate(translations, key, params);
  }, [lang]);

  const tierLabel = (id) => {
    const meta = AUDIT_TIERS.find((item) => item.id === id);
    return meta ? t(meta.nameKey) : id;
  };

  const tier = AUDIT_TIERS.find(t => t.id === selectedTier);
  const finalPrice = isUrgent ? Math.round(tier.price * 1.2) : tier.price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/audit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          tier: selectedTier,
          urgency: isUrgent ? "urgent" : "normal",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("audit.form.submitError"));
      }

      setSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-16">
          <div className="max-w-2xl mx-auto px-6">
            <div className="bg-base-200 rounded-2xl p-8 text-center border border-green-500/30">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">{t("audit.success.title")}</h1>
              <p className="text-base-content/70 mb-6">
                {t("audit.success.subtitle")}
              </p>

              <div className="bg-base-300 rounded-xl p-4 mb-6 text-left">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-base-content/60">{t("audit.success.reference")}</span>
                    <p className="font-mono font-bold">{success.reference}</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">{t("audit.success.tier")}</span>
                    <p className="font-semibold">{tierLabel(success.tier)}</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">{t("audit.success.price")}</span>
                    <p className="font-bold text-primary">${success.price}</p>
                  </div>
                  <div>
                    <span className="text-base-content/60">{t("audit.success.turnaround")}</span>
                    <p className="font-semibold">{success.turnaround}</p>
                  </div>
                </div>
              </div>

              <div className="text-left mb-6">
                <h3 className="font-semibold mb-2">{t("audit.success.nextSteps")}</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-base-content/70">
                  {success.next_steps?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              <Link href="/products" className="btn btn-primary">
                {t("audit.success.cta")}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t("audit.hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t("audit.hero.title")} <span className="text-primary">{t("audit.hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-base-content/70 max-w-2xl mx-auto">
            {t("audit.hero.subtitle")}
          </p>
        </section>

        {/* Stats */}
        <section className="max-w-4xl mx-auto px-6 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "2,159+", labelKey: "audit.stats.norms" },
              { value: "24h", labelKey: "audit.stats.fastest" },
              { value: "100+", labelKey: "audit.stats.projects" },
              { value: "87%", labelKey: "audit.stats.hacks" },
            ].map((stat, i) => (
              <div key={i} className="bg-base-200 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-base-content/60">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Tier Selection */}
        <section className="max-w-5xl mx-auto px-6 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">{t("audit.tiers.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {AUDIT_TIERS.map((tierOption) => (
              <button
                key={tierOption.id}
                onClick={() => setSelectedTier(tierOption.id)}
                className={`relative rounded-2xl p-6 text-left transition-all ${
                  selectedTier === tierOption.id
                    ? "bg-primary/10 border-2 border-primary shadow-lg shadow-primary/10"
                    : "bg-base-200 border-2 border-transparent hover:border-base-300"
                }`}
              >
                {tierOption.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-content px-3 py-1 rounded-full text-xs font-medium">
                      {t("audit.tiers.popular")}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{t(tierOption.nameKey)}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTier === tierOption.id ? "border-primary bg-primary" : "border-base-content/30"
                  }`}>
                    {selectedTier === tierOption.id && (
                      <svg className="w-3 h-3 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">${tierOption.price}</span>
                  <span className="text-base-content/60">{t("audit.tiers.perAudit")}</span>
                </div>

                <p className="text-sm text-base-content/70 mb-4">{t(tierOption.descriptionKey)}</p>

                <div className="flex items-center gap-2 text-sm text-base-content/60 mb-4">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t("audit.tiers.turnaround", { time: tierOption.turnaround })}</span>
                </div>

                <ul className="space-y-2">
                  {tierOption.features.slice(0, 4).map((featureKey, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{t(featureKey)}</span>
                    </li>
                  ))}
                  {tierOption.features.length > 4 && (
                    <li className="text-sm text-primary">
                      {t("audit.tiers.more", { count: tierOption.features.length - 4 })}
                    </li>
                  )}
                </ul>

                <p className="mt-4 text-xs text-base-content/50">
                  {t("audit.tiers.ideal", { ideal: t(tierOption.idealKey) })}
                </p>
              </button>
            ))}
          </div>

          {/* Urgent Option */}
          <div className="mt-6 flex justify-center">
            <label className="flex items-center gap-3 cursor-pointer bg-base-200 rounded-xl px-6 py-4">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <div>
                <span className="font-medium">{t("audit.urgent.title")}</span>
                <span className="text-amber-500 ml-2">{t("audit.urgent.surcharge")}</span>
                <p className="text-sm text-base-content/60">{t("audit.urgent.note")}</p>
              </div>
            </label>
          </div>
        </section>

        {/* Form */}
        <section className="max-w-2xl mx-auto px-6 mb-12">
          <div className="bg-base-200 rounded-2xl p-8 border border-base-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{t("audit.form.title")}</h2>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">${finalPrice}</div>
                <div className="text-sm text-base-content/60">{t("audit.form.tierLabel", { tier: tier ? t(tier.nameKey) : "" })}</div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error mb-6">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.projectName")}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    placeholder={t("audit.form.projectNamePlaceholder")}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.projectUrl")}</span>
                  </label>
                  <input
                    type="url"
                    value={formData.project_url}
                    onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                    placeholder={t("audit.form.projectUrlPlaceholder")}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.projectType")}</span>
                  </label>
                  <select
                    value={formData.project_type}
                    onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                    className="select select-bordered w-full"
                  >
                    <option value="defi">{t("audit.form.types.defi")}</option>
                    <option value="wallet">{t("audit.form.types.wallet")}</option>
                    <option value="exchange">{t("audit.form.types.exchange")}</option>
                    <option value="bridge">{t("audit.form.types.bridge")}</option>
                    <option value="nft">{t("audit.form.types.nft")}</option>
                    <option value="other">{t("audit.form.types.other")}</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.email")}</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t("audit.form.emailPlaceholder")}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">{t("audit.form.description")}</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("audit.form.descriptionPlaceholder")}
                  className="textarea textarea-bordered w-full h-24"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.telegram")}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder={t("audit.form.telegramPlaceholder")}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">{t("audit.form.twitter")}</span>
                  </label>
                  <input
                    type="text"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder={t("audit.form.twitterPlaceholder")}
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <>{t("audit.form.submit", { tier: tier ? t(tier.nameKey) : "", price: finalPrice })}</>
                )}
              </button>

              <p className="text-xs text-center text-base-content/50">
                {t("audit.form.paymentNote")}
              </p>
            </form>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-4xl mx-auto px-6 mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">{t("audit.testimonials.title")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="bg-base-200 rounded-xl p-6 border border-base-300">
                <svg className="w-8 h-8 text-primary/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-lg mb-4 italic">&ldquo;{t(testimonial.quoteKey)}&rdquo;</p>
                <div>
                  <div className="font-medium">{t(testimonial.authorKey)}</div>
                  <div className="text-sm text-base-content/60">{t(testimonial.projectKey)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-8">{t("audit.faq.title")}</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="collapse collapse-arrow bg-base-200">
                <input type="radio" name="faq" />
                <div className="collapse-title font-medium">{t(faq.qKey)}</div>
                <div className="collapse-content text-base-content/70">
                  <p>{t(faq.aKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
