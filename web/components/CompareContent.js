"use client";

import Link from "next/link";
import ProductLogo from "@/components/ProductLogo";
import ShareButtons from "@/components/ShareButtons";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import config from "@/config";

import { getScoreColor } from "@/libs/score-utils";

const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/20 border-green-500/30";
  if (score >= 60) return "bg-amber-500/20 border-amber-500/30";
  return "bg-red-500/20 border-red-500/30";
};

// Winner badge
const WinnerBadge = ({ label }) => (
  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold uppercase">
    {label}
  </span>
);

const pillarKeyMap = {
  S: "security",
  A: "adversity",
  F: "fidelity",
  E: "efficiency",
};

export default function CompareContent({ productA, productB, stats, winners, pillarWins, comparisonUrl }) {
  const { t } = useTranslation();
  const winnerName = winners.total === "A" ? productA.name : productB.name;
  const winnerScore = winners.total === "A" ? productA.scores.total : productB.scores.total;
  const loserScore = winners.total === "A" ? productB.scores.total : productA.scores.total;
  const getPillarLabel = (count) => (count === 1 ? t("compare.pillar") : t("compare.pillars"));
  const faqResult =
    winners.total === "tie"
      ? t("compare.faqWhichSaferResultTie")
      : t("compare.faqWhichSaferResultWinner", {
          winner: winnerName,
          score: winnerScore,
        });

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-base-content/60 mb-8">
        <Link href="/" className="hover:text-base-content">{t("common.home")}</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-base-content">{t("nav.products")}</Link>
        <span>/</span>
        <span className="text-base-content">{t("nav.compare")}</span>
      </div>

      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {productA.name} {t("compare.vsText")} {productB.name}
        </h1>
        <p className="text-base-content/60 max-w-2xl mx-auto">
          {t("compare.securityComparison", { count: stats.totalNorms })}
        </p>
      </div>

      {/* Main comparison grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        {/* Product A */}
        <div className={`rounded-xl border p-6 relative ${getScoreBg(productA.scores.total)}`}>
          {winners.total === 'A' && <WinnerBadge label={t("compare.winner")} />}
          <div className="flex items-center gap-3 mb-4">
            <ProductLogo logoUrl={productA.logoUrl} name={productA.name} size="md" />
            <div>
              <h2 className="font-bold text-lg">{productA.name}</h2>
              <p className="text-sm text-base-content/60">{productA.type}</p>
            </div>
          </div>
          <div className={`text-5xl font-bold text-center mb-2 ${getScoreColor(productA.scores.total)}`}>
            {productA.scores.total}
          </div>
          <div className="text-center text-sm text-base-content/60 mb-4">{t("product.safeScore")}</div>
          <Link href={`/products/${productA.slug}`} className="btn btn-sm btn-outline w-full">
            {t("product.viewDetails")}
          </Link>
        </div>

        {/* VS */}
        <div className="flex items-center justify-center">
          <div className="text-4xl font-black text-base-content/20">{t("compare.vsText")}</div>
        </div>

        {/* Product B */}
        <div className={`rounded-xl border p-6 relative ${getScoreBg(productB.scores.total)}`}>
          {winners.total === 'B' && <WinnerBadge label={t("compare.winner")} />}
          <div className="flex items-center gap-3 mb-4">
            <ProductLogo logoUrl={productB.logoUrl} name={productB.name} size="md" />
            <div>
              <h2 className="font-bold text-lg">{productB.name}</h2>
              <p className="text-sm text-base-content/60">{productB.type}</p>
            </div>
          </div>
          <div className={`text-5xl font-bold text-center mb-2 ${getScoreColor(productB.scores.total)}`}>
            {productB.scores.total}
          </div>
          <div className="text-center text-sm text-base-content/60 mb-4">{t("product.safeScore")}</div>
          <Link href={`/products/${productB.slug}`} className="btn btn-sm btn-outline w-full">
            {t("product.viewDetails")}
          </Link>
        </div>
      </div>

      {/* Pillar breakdown */}
      <div className="rounded-xl bg-base-200 border border-base-300 p-6 mb-12">
        <h2 className="text-xl font-bold mb-6 text-center">{t("compare.pillarComparison")}</h2>

        <div className="space-y-4">
          {config.safe.pillars.map((pillar) => {
            const codeKey = pillar.code.toLowerCase();
            const scoreA = productA.scores[codeKey];
            const scoreB = productB.scores[codeKey];
            const winner = winners[codeKey];
            const pillarKey = pillarKeyMap[pillar.code] || pillar.name.toLowerCase();

            return (
              <div key={pillar.code} className="grid grid-cols-7 gap-4 items-center p-4 rounded-lg bg-base-300/50">
                {/* Product A score */}
                <div className={`col-span-2 text-right ${winner === 'A' ? 'font-bold' : ''}`}>
                  <span className={`text-2xl ${getScoreColor(scoreA)}`}>{scoreA}</span>
                  {winner === 'A' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="ml-2 w-4 h-4 text-green-400"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Progress bar A */}
                <div className="col-span-1">
                  <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scoreA}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                </div>

                {/* Pillar name */}
                <div className="col-span-1 text-center">
                  <div className="text-2xl font-black" style={{ color: pillar.color }}>
                    {pillar.code}
                  </div>
                  <div className="text-xs text-base-content/60">
                    {t(`pillars.${pillarKey}`)}
                  </div>
                </div>

                {/* Progress bar B */}
                <div className="col-span-1">
                  <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scoreB}%`,
                        backgroundColor: pillar.color,
                      }}
                    />
                  </div>
                </div>

                {/* Product B score */}
                <div className={`col-span-2 text-left ${winner === 'B' ? 'font-bold' : ''}`}>
                  {winner === 'B' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="mr-2 w-4 h-4 text-green-400"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span className={`text-2xl ${getScoreColor(scoreB)}`}>{scoreB}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 p-4 rounded-lg bg-base-300 text-center">
          <p className="text-base-content/80">
            <strong>{productA.name}</strong>{" "}
            {t("compare.winsInPrefix")}{" "}
            <strong className="text-green-400">{pillarWins.A}</strong>{" "}
            {getPillarLabel(pillarWins.A)}
            {" "}&bull;{" "}
            <strong>{productB.name}</strong>{" "}
            {t("compare.winsInPrefix")}{" "}
            <strong className="text-green-400">{pillarWins.B}</strong>{" "}
            {getPillarLabel(pillarWins.B)}
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className="rounded-xl bg-gradient-to-br from-primary/20 to-base-200 border border-base-300 p-8 text-center mb-12">
        <h2 className="text-2xl font-bold mb-4">{t("compare.verdict")}</h2>
        {winners.total === 'tie' ? (
          <p className="text-lg text-base-content/80">
            {t("compare.verdictTie")}
          </p>
        ) : (
          <p className="text-lg text-base-content/80">
            {t("compare.verdictWinner", {
              winner: winnerName,
              winnerScore,
              loserScore,
            })}
          </p>
        )}

        {/* Share comparison */}
        <div className="mt-6 pt-6 border-t border-base-content/10">
          <ShareButtons
            url={comparisonUrl}
            title={`${productA.name} vs ${productB.name} - ${t("compare.subtitle")}`}
            type="comparison"
            productName={productA.name}
            comparedProduct={productB.name}
            score={winners.total === 'A' ? productA.scores.total : productB.scores.total}
            variant="full"
          />
        </div>
      </div>

      {/* Compare other products CTA */}
      <div className="text-center">
        <p className="text-base-content/60 mb-4">{t("compare.wantCompareOther")}</p>
        <Link href="/products" className="btn btn-primary">
          {t("compare.browseAll")}
        </Link>
      </div>

      {/* SEO: Structured FAQ */}
      <div className="mt-16 rounded-xl bg-base-200 border border-base-300 p-8">
        <h2 className="text-xl font-bold mb-6">{t("compare.faqTitle")}</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">
              {t("compare.faqWhichSafer", { productA: productA.name, productB: productB.name })}
            </h3>
            <p className="text-base-content/70">
              {t("compare.faqWhichSaferAnswer", {
                count: stats.totalNorms,
                result: faqResult,
              })}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t("compare.faqWhatIsSafe")}</h3>
            <p className="text-base-content/70">
              {t("compare.faqWhatIsSafeAnswer", { count: stats.totalNorms })}
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">{t("compare.faqHowOften")}</h3>
            <p className="text-base-content/70">
              {t("compare.faqHowOftenAnswer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
