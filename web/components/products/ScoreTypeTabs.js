"use client";

import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";
import { scoreTypes } from "./constants";

// Horizontal tabs to switch between Full / Consumer / Essential score views
export default function ScoreTypeTabs({ scoreType, setScoreType }) {
  const { t } = useTranslation();

  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {scoreTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setScoreType(type.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              scoreType === type.id
                ? "bg-primary text-primary-content"
                : "bg-base-200 text-base-content/70 hover:bg-base-300"
            }`}
          >
            <span>{type.label}</span>
            <span className="ml-1.5 text-xs opacity-70">({type.description})</span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-base-content/50">
        {scoreType === "essential" && t("productsPage.scoreTypeExplanations.essential")}
        {scoreType === "consumer" && t("productsPage.scoreTypeExplanations.consumer")}
        {scoreType === "full" && t("productsPage.scoreTypeExplanations.full", { count: config.safe.stats.totalNorms })}
      </p>
    </div>
  );
}
