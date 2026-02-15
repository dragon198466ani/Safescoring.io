import config from "@/config";
import { getT } from "@/libs/i18n/server";
import { getNormStats } from "@/libs/getNormStats";

const WhyNotAudits = async () => {
  const t = await getT();
  const normStats = await getNormStats();
  const totalNorms = normStats?.totalNorms ?? "—";

  const rows = [
    {
      criteria: t("whyNotAudits.coverage"),
      audit: t("whyNotAudits.coverageAudit"),
      safe: t("whyNotAudits.coverageSafe"),
      safeWins: true,
    },
    {
      criteria: t("whyNotAudits.frequency"),
      audit: t("whyNotAudits.frequencyAudit"),
      safe: t("whyNotAudits.frequencySafe"),
      safeWins: true,
    },
    {
      criteria: t("whyNotAudits.methodology"),
      audit: t("whyNotAudits.methodologyAudit"),
      safe: t("whyNotAudits.methodologySafe", { norms: totalNorms }),
      safeWins: true,
    },
    {
      criteria: t("whyNotAudits.comparability"),
      audit: t("whyNotAudits.comparabilityAudit"),
      safe: t("whyNotAudits.comparabilitySafe"),
      safeWins: true,
    },
    {
      criteria: t("whyNotAudits.cost"),
      audit: t("whyNotAudits.costAudit"),
      safe: t("whyNotAudits.costSafe"),
      safeWins: true,
    },
    {
      criteria: t("whyNotAudits.accessibility"),
      audit: t("whyNotAudits.accessibilityAudit"),
      safe: t("whyNotAudits.accessibilitySafe"),
      safeWins: true,
    },
  ];

  return (
    <section className="py-24 px-6 bg-base-200/30" id="why-audits">
      <div className="max-w-6xl mx-auto">
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
                  SafeScoring
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
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
                      {row.safe}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom stats */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <div className="text-4xl font-bold text-amber-400 mb-2">~50%</div>
            <div className="text-sm text-base-content/60">
              {t("whyNotAudits.statExploited")}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20">
            <div className="text-4xl font-bold text-primary mb-2">{totalNorms}</div>
            <div className="text-sm text-base-content/60">
              {t("whyNotAudits.statNorms")}
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
            <div className="text-4xl font-bold text-green-400 mb-2">
              {t("whyNotAudits.statMonthly")}
            </div>
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
