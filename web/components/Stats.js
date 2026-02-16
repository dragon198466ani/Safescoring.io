"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useNormStats } from "@/libs/NormStatsProvider";

const iconPaths = {
  norms: "M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z",
  types: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  products: "M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3",
  paid: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
};

const Icon = ({ path }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const Stats = () => {
  const { t } = useTranslation();
  const normStats = useNormStats();

  const statDefs = [
    {
      value: normStats?.totalNorms || "2000+",
      labelKey: "stats.securityNorms",
      descKey: "stats.securityNormsDesc",
      highlight: true,
      iconKey: "norms",
    },
    {
      value: normStats?.totalProductTypes || "10+",
      labelKey: "stats.productTypes",
      descKey: "stats.productTypesDesc",
      iconKey: "types",
    },
    {
      value: normStats?.totalProducts ? `${normStats.totalProducts}+` : "1000+",
      labelKey: "stats.productsScored",
      descKey: "stats.productsScoredDesc",
      iconKey: "products",
    },
    {
      value: "0",
      labelKey: "stats.paidRankings",
      descKey: "stats.paidRankingsDesc",
      iconKey: "paid",
    },
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statDefs.map((stat, index) => (
            <div
              key={index}
              className="card-metric group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content transition-colors">
                  <Icon path={iconPaths[stat.iconKey]} />
                </div>
                <span className="text-sm font-medium text-base-content/60">
                  {t(stat.labelKey)}
                </span>
              </div>
              <div className="text-3xl font-bold text-base-content mb-1 stat-value">
                {stat.value}
              </div>
              <p className="text-sm text-base-content/50">
                {t(stat.descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
