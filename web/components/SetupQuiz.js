"use client";

import { useState } from "react";
import { useTranslation } from "@/libs/i18n/LanguageProvider";

/**
 * SetupQuiz - Recommendation quiz to help users build their crypto stack
 */

const QUIZ_QUESTIONS = [
  {
    id: "experience",
    questionKey: "setupQuiz.experienceQuestion",
    iconKey: "setupQuiz.experienceIcon",
    options: [
      { id: "beginner", labelKey: "setupQuiz.beginnerLabel", descKey: "setupQuiz.beginnerDesc", tags: ["simple", "user-friendly"] },
      { id: "intermediate", labelKey: "setupQuiz.intermediateLabel", descKey: "setupQuiz.intermediateDesc", tags: ["balanced"] },
      { id: "advanced", labelKey: "setupQuiz.advancedLabel", descKey: "setupQuiz.advancedDesc", tags: ["advanced", "defi"] },
    ],
  },
  {
    id: "holdings",
    questionKey: "setupQuiz.holdingsQuestion",
    iconKey: "setupQuiz.holdingsIcon",
    options: [
      { id: "small", labelKey: "setupQuiz.holdingsSmallLabel", descKey: "setupQuiz.holdingsSmallDesc", tags: ["software"] },
      { id: "medium", labelKey: "setupQuiz.holdingsMediumLabel", descKey: "setupQuiz.holdingsMediumDesc", tags: ["hardware-optional"] },
      { id: "large", labelKey: "setupQuiz.holdingsLargeLabel", descKey: "setupQuiz.holdingsLargeDesc", tags: ["hardware"] },
      { id: "whale", labelKey: "setupQuiz.holdingsWhaleLabel", descKey: "setupQuiz.holdingsWhaleDesc", tags: ["hardware", "multisig", "custody"] },
    ],
  },
  {
    id: "usage",
    questionKey: "setupQuiz.usageQuestion",
    iconKey: "setupQuiz.usageIcon",
    options: [
      { id: "hodl", labelKey: "setupQuiz.hodlLabel", descKey: "setupQuiz.hodlDesc", tags: ["cold-storage", "hardware"] },
      { id: "trade", labelKey: "setupQuiz.tradeLabel", descKey: "setupQuiz.tradeDesc", tags: ["exchange", "hot-wallet"] },
      { id: "defi", labelKey: "setupQuiz.defiLabel", descKey: "setupQuiz.defiDesc", tags: ["defi", "software"] },
      { id: "payments", labelKey: "setupQuiz.paymentsLabel", descKey: "setupQuiz.paymentsDesc", tags: ["mobile", "fast"] },
    ],
  },
  {
    id: "chains",
    questionKey: "setupQuiz.chainsQuestion",
    iconKey: "setupQuiz.chainsIcon",
    multiSelect: true,
    options: [
      { id: "bitcoin", labelKey: "setupQuiz.bitcoinLabel", tags: ["bitcoin"] },
      { id: "ethereum", labelKey: "setupQuiz.ethereumLabel", tags: ["ethereum", "evm"] },
      { id: "solana", labelKey: "setupQuiz.solanaLabel", tags: ["solana"] },
      { id: "multi", labelKey: "setupQuiz.multiLabel", tags: ["multichain"] },
    ],
  },
  {
    id: "priority",
    questionKey: "setupQuiz.priorityQuestion",
    iconKey: "setupQuiz.priorityIcon",
    options: [
      { id: "security", labelKey: "setupQuiz.securityLabel", descKey: "setupQuiz.securityDesc", tags: ["security-first"] },
      { id: "ease", labelKey: "setupQuiz.easeLabel", descKey: "setupQuiz.easeDesc", tags: ["user-friendly"] },
      { id: "features", labelKey: "setupQuiz.featuresLabel", descKey: "setupQuiz.featuresDesc", tags: ["feature-rich"] },
      { id: "cost", labelKey: "setupQuiz.costLabel", descKey: "setupQuiz.costDesc", tags: ["affordable"] },
    ],
  },
];

// Recommendation logic based on quiz answers
function getRecommendations(answers, products) {
  const scores = {};

  // Score each product based on quiz answers
  products.forEach(product => {
    let score = 0;
    const _productTags = [
      product.type_code,
      product.name?.toLowerCase(),
    ].filter(Boolean);

    // Experience level matching
    if (answers.experience === "beginner" && product.score_e >= 70) score += 2;
    if (answers.experience === "advanced" && product.type_code === "defi") score += 2;

    // Holdings matching
    if (answers.holdings === "large" || answers.holdings === "whale") {
      if (product.type_code?.includes("hardware")) score += 3;
    }
    if (answers.holdings === "small" && product.type_code?.includes("software")) score += 2;

    // Usage matching
    if (answers.usage === "hodl" && product.type_code?.includes("hardware")) score += 3;
    if (answers.usage === "trade" && product.type_code === "exchange") score += 2;
    if (answers.usage === "defi" && product.type_code === "defi") score += 3;

    // Priority matching
    if (answers.priority === "security" && product.score_s >= 80) score += 3;
    if (answers.priority === "ease" && product.score_e >= 80) score += 3;

    // Base score from SAFE rating
    score += (product.score || 0) / 20;

    scores[product.id] = score;
  });

  // Sort and return top recommendations
  return products
    .filter(p => scores[p.id] > 0)
    .sort((a, b) => scores[b.id] - scores[a.id])
    .slice(0, 6);
}

export default function SetupQuiz({ products, onComplete, onSkip }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleAnswer = (optionId) => {
    const newAnswers = { ...answers, [currentQuestion.id]: optionId };
    setAnswers(newAnswers);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    } else {
      setShowResults(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const recommendations = showResults ? getRecommendations(answers, products) : [];

  if (showResults) {
    return (
      <div className="bg-base-200 rounded-2xl border border-base-300 p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-xl font-bold">{t("setupQuiz.recommendedForYou")}</h3>
          <p className="text-base-content/60 text-sm mt-1">
            {t("setupQuiz.recommendedDesc")}
          </p>
        </div>

        {recommendations.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {recommendations.map(product => (
              <button
                key={product.id}
                onClick={() => onComplete(product)}
                className="p-3 rounded-xl bg-base-300 hover:bg-primary/20 hover:border-primary/50 border border-transparent transition-all text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-base-100 flex items-center justify-center text-sm font-bold">
                    {product.name?.charAt(0)}
                  </div>
                  <span className={`text-sm font-bold ${
                    product.score >= 80 ? "text-green-400" :
                    product.score >= 60 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {product.score}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{product.name}</p>
                <p className="text-xs text-base-content/50">{product.type_name}</p>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-base-content/50 py-4">
            {t("setupQuiz.noRecommendations")}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowResults(false);
              setCurrentStep(0);
              setAnswers({});
            }}
            className="btn btn-ghost flex-1"
          >
            {t("setupQuiz.retakeQuiz")}
          </button>
          <button onClick={onSkip} className="btn btn-primary flex-1">
            {t("setupQuiz.browseCatalog")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-2xl border border-base-300 p-6">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-base-content/60">{t("setupQuiz.questionCount", { current: currentStep + 1, total: QUIZ_QUESTIONS.length })}</span>
          <button onClick={onSkip} className="text-primary hover:underline text-sm">
            {t("setupQuiz.skipQuiz")}
          </button>
        </div>
        <div className="h-2 bg-base-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">{t(currentQuestion.iconKey)}</div>
        <h3 className="text-xl font-bold">{t(currentQuestion.questionKey)}</h3>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {currentQuestion.options.map(option => (
          <button
            key={option.id}
            onClick={() => handleAnswer(option.id)}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              answers[currentQuestion.id] === option.id
                ? "bg-primary/20 border-primary"
                : "bg-base-300 border-base-300 hover:border-primary/50"
            }`}
          >
            <p className="font-medium">{t(option.labelKey)}</p>
            {option.descKey && (
              <p className="text-sm text-base-content/60 mt-1">{t(option.descKey)}</p>
            )}
          </button>
        ))}
      </div>

      {/* Navigation */}
      {currentStep > 0 && (
        <button onClick={handleBack} className="btn btn-ghost btn-sm gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {t("setupQuiz.back")}
        </button>
      )}
    </div>
  );
}
