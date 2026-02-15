"use client";

import { useState } from "react";
import config from "@/config";
import PillarInfoModal from "./PillarInfoModal";
import PillarIllustrations, { ExampleIcons } from "./PillarIllustrations";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { useNormStats } from "@/libs/NormStatsProvider";

// Icon mappings per pillar norm index
const pillarIcons = {
  S: ["encryption", "signature", "key", "signature", "encryption"],
  A: ["duress", "hidden", "shield", "hidden", "shield"],
  F: ["audit", "bug", "update", "audit", "update"],
  E: ["multichain", "mobile", "speed", "mobile", "mobile"],
};

const Pillars = () => {
  const [selectedPillar, setSelectedPillar] = useState(null);
  const { t } = useTranslation();
  const normStats = useNormStats();

  const openModal = (pillarCode) => {
    setSelectedPillar(pillarCode);
  };

  const closeModal = () => {
    setSelectedPillar(null);
  };

  const getSelectedPillarColor = () => {
    if (!selectedPillar) return "#6366f1";
    const pillar = config.safe.pillars.find((p) => p.code === selectedPillar);
    return pillar?.color || "#6366f1";
  };

  return (
    <section id="pillars" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 mb-4 text-sm font-medium rounded-full bg-primary/10 text-primary">
            {t("pillars.methodology")}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            {t("pillars.frameworkTitle")} <span className="text-gradient-safe">SAFE</span> Framework
          </h2>
          <p className="text-lg text-base-content/60 max-w-2xl mx-auto">
            {t("pillars.frameworkDesc", { count: normStats?.totalNorms || "2000+" })}
          </p>
        </div>

        {/* Pillars grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {config.safe.pillars.map((pillar) => {
            const normItems = t(`pillars.norms.${pillar.code}.items`);
            const normExample = t(`pillars.norms.${pillar.code}.example`);
            const icons = pillarIcons[pillar.code] || [];
            // normItems might be a key string if not found — fallback to array
            const norms = Array.isArray(normItems) ? normItems : [];

            return (
              <div
                key={pillar.code}
                className="relative group p-8 rounded-2xl bg-base-200/50 border border-base-300 hover:border-opacity-50 transition-all duration-300 overflow-hidden"
              >
                {/* Glow effect */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
                  style={{ backgroundColor: pillar.color }}
                />

                {/* Illustration */}
                <div className="relative flex justify-center mb-6">
                  {(() => {
                    const IllustrationComponent = PillarIllustrations[pillar.code];
                    return IllustrationComponent ? (
                      <IllustrationComponent size={120} color={pillar.color} />
                    ) : null;
                  })()}
                </div>

                {/* Header */}
                <div className="relative text-center mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold">{pillar.name}</h3>
                    <button
                      onClick={() => openModal(pillar.code)}
                      className="btn btn-ghost btn-xs btn-circle opacity-60 hover:opacity-100 transition-opacity"
                      title={t("pillars.learnMore", { name: pillar.name })}
                      aria-label={t("pillars.learnMore", { name: pillar.name })}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4"
                        style={{ color: pillar.color }}
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-base-content/60">{pillar.description}</p>
                </div>

                {/* Example norms */}
                <div className="relative space-y-3 mb-6">
                  {norms.map((normText, i) => {
                    const IconComponent = ExampleIcons[icons[i]];
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6">
                          {IconComponent ? (
                            <IconComponent size={24} color={pillar.color} />
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-5 h-5"
                              style={{ color: pillar.color }}
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-base-content/80">{normText}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Example question */}
                <div
                  className="relative p-4 rounded-lg border-l-4"
                  style={{ borderColor: pillar.color, backgroundColor: `${pillar.color}10` }}
                >
                  <p className="text-sm text-base-content/70 italic">
                    &quot;{normExample}&quot;
                  </p>
                </div>

                {/* View standards link */}
                <button
                  onClick={() => openModal(pillar.code)}
                  className="mt-4 text-sm font-medium flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                  style={{ color: pillar.color }}
                >
                  <span>{t("pillars.viewStandards")}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-base-content/60 mb-4">
            {t("pillars.wantFullMethodology")}
          </p>
          <a
            href="/methodology"
            className="btn btn-outline btn-primary"
          >
            {t("pillars.viewAllNorms", { count: normStats?.totalNorms || "2000+" })}
          </a>
        </div>
      </div>

      {/* Pillar Info Modal */}
      <PillarInfoModal
        isOpen={selectedPillar !== null}
        onClose={closeModal}
        pillarCode={selectedPillar}
        pillarColor={getSelectedPillarColor()}
      />
    </section>
  );
};

export default Pillars;
