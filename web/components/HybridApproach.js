"use client";

import Link from "next/link";
import { useStats } from "@/hooks/useStats";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

const HybridApproach = () => {
  const { stats } = useStats();
  const { t } = useTranslation();

  return (
    <section className="py-12 px-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-base-200/30 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header with context */}
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 mb-3 text-xs font-medium rounded-full bg-primary/10 text-primary">
            {t("hybridApproach.badge")}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
            {t("hybridApproach.title")}
          </h2>
          <p className="text-sm md:text-base text-base-content/60 max-w-2xl mx-auto">
            {t("hybridApproach.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 100% AI */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative card bg-base-100 shadow-md border border-base-300 hover:border-primary/50 p-5 transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                  <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{t("hybridApproach.aiOnly")}</h3>
                  <p className="text-xs text-base-content/70 leading-relaxed">
                    {t("hybridApproach.aiDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hybrid - Highlighted */}
          <div className="relative group md:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl p-5 h-full border-2 border-green-400/50">
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-semibold">
                  {t("hybridApproach.ourApproach")}
                </span>
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">{t("hybridApproach.hybrid")}</h3>
                  <p className="text-xs leading-relaxed opacity-95">
                    {t("hybridApproach.hybridDesc", { norms: stats.totalNorms })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 100% Human */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative card bg-base-100 shadow-md border border-base-300 hover:border-primary/50 p-5 transition-all duration-300 h-full">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">{t("hybridApproach.humanOnly")}</h3>
                  <p className="text-xs text-base-content/70 leading-relaxed">
                    {t("hybridApproach.humanDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Micro CTA */}
        <div className="text-center mt-8">
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/compare"
              className="btn btn-primary btn-sm gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              {t("hybridApproach.compareProducts")}
            </Link>
            <a
              href="/stack-builder"
              className="btn btn-outline btn-sm gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75l-5.571-3m11.142 0l4.179 2.25-4.179 2.25m0 0L12 17.25l-5.571-3m11.142 0l4.179 2.25L12 21.75l-9.75-5.25 4.179-2.25" />
              </svg>
              {t("hybridApproach.buildMyStack")}
            </a>
          </div>
          <p className="mt-2 text-xs text-base-content/50">
            {t("hybridApproach.seeHybrid")}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HybridApproach;
