"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useNormStats } from "@/libs/NormStatsProvider";
import config from "@/config";

const faqKeys = [
  "whatIsSafeScore",
  "howToUseScore",
  "howToImprove",
  "whatIsSafeScoring",
  "vsCertik",
  "howEvaluated",
  "updateFrequency",
  "independence",
  "fourPillars",
  "requestEvaluation",
  "scoreCalculation",
  "planDifference",
  "refunds",
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const { t } = useTranslation();
  const normStats = useNormStats();

  const th = config.safe.thresholds;
  const faqs = faqKeys.map((key) => ({
    question: t(`faq.items.${key}.q`),
    answer: t(`faq.items.${key}.a`, {
      count: normStats?.totalNorms || "2000+",
      excellent: th.excellent,
      excellentMinus: th.excellent - 1,
      good: th.good,
    }),
  }));

  return (
    <section className="py-24 px-6 bg-base-200/30" id="faq">
      <div className="max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            FAQ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t("faq.title")}
          </h2>
          <p className="text-lg text-base-content/60">
            {t("faq.subtitle")}
          </p>
        </div>

        {/* FAQ items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-xl border border-base-300 bg-base-200/50 overflow-hidden"
            >
              <button
                id={`faq-trigger-${index}`}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-base-300/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                aria-expanded={openIndex === index}
                aria-controls={`faq-panel-${index}`}
              >
                <span className="font-semibold pr-4">{faq.question}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                id={`faq-panel-${index}`}
                role="region"
                aria-labelledby={`faq-trigger-${index}`}
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-5 text-base-content/70">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-12">
          <p className="text-base-content/60 mb-4">
            {t("faq.stillQuestions")}
          </p>
          <a
            href="mailto:support@safescoring.io"
            className="btn btn-outline btn-sm"
          >
            {t("faq.contactSupport")}
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
