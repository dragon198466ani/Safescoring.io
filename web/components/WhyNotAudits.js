"use client";

import config from "@/config";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useNormStats } from "@/libs/NormStatsProvider";

const rowKeys = ["coverage", "frequency", "methodology", "opSec", "trackRecord", "reproducibility", "cost", "independence"];

const WhyNotAudits = () => {
  const { t } = useTranslation();
  const normStats = useNormStats();

  return (
    <section className="py-24 px-6 bg-base-200/30" id="why-audits">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-amber-500/10 text-amber-500">
            {config.safe.taglineAlt}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("whyNotAudits.title")}
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            {t("whyNotAudits.subtitle")}
          </p>
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-300">
                <th className="text-left py-4 px-4 font-semibold text-base-content/60">
                  {t("whyNotAudits.criteria")}
                </th>
                <th className="text-center py-4 px-4 font-semibold text-base-content/60">
                  {t("whyNotAudits.traditionalAudits")}
                </th>
                <th className="text-center py-4 px-4 font-semibold text-primary">
                  {t("whyNotAudits.safeScoring")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rowKeys.map((key) => {
                const row = t(`whyNotAudits.rows.${key}`);
                // row is an object { criteria, audit, safe }
                if (!row || typeof row === "string") return null;
                return (
                  <tr
                    key={key}
                    className="border-b border-base-300/50 hover:bg-base-200/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">{row.criteria}</td>
                    <td className="py-4 px-4 text-center text-base-content/60">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-base-content/40">—</span>
                        {row.audit}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-green-500 font-medium">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {key === "methodology" ? `${normStats?.totalNorms || "2000+"} ${row.safe}` : row.safe}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="text-4xl font-bold text-amber-400 mb-2">20%</div>
            <div className="text-sm text-base-content/60">
              {t("whyNotAudits.stat87")}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="text-4xl font-bold text-primary mb-2">{normStats?.totalNorms || "2000+"}</div>
            <div className="text-sm text-base-content/60">
              {t("whyNotAudits.stat916")}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
            <div className="text-4xl font-bold text-green-400 mb-2">{t("whyNotAudits.statMonthly")}</div>
            <div className="text-sm text-base-content/60">
              {t("whyNotAudits.statMonthlyDesc")}
            </div>
          </div>
        </div>

        {/* Note */}
        <p className="mt-8 text-center text-sm text-base-content/50">
          {t("whyNotAudits.note")}
        </p>

        {/* Disclaimer */}
        <p className="mt-4 text-center text-sm text-base-content/40">
          {t("whyNotAudits.sources")}
        </p>
      </div>
    </section>
  );
};

export default WhyNotAudits;
