"use client";

import Link from "next/link";
import { useTranslation } from "@/libs/i18n/LanguageProvider";
import { getScoreColor as getScoreColorUtil, getScoreBgClass, getScoreBorderClass } from "@/libs/score-utils";

/**
 * ScoreBadge - Embeddable score badge component
 *
 * @param {Object} props
 * @param {string} props.productName - Name of the product
 * @param {string} props.productSlug - Slug for linking
 * @param {number} props.score - Score 0-100
 * @param {string} props.type - Product type (optional)
 * @param {string} props.size - 'sm' | 'md' | 'lg'
 * @param {string} props.variant - 'default' | 'minimal' | 'detailed'
 * @param {boolean} props.showLink - Show link to product page
 * @param {string} props.className - Additional CSS classes
 */
const ScoreBadge = ({
  productName,
  productSlug,
  score,
  type,
  size = "md",
  variant = "default",
  showLink = true,
  className = "",
}) => {
  const { t } = useTranslation();

  // Use centralized score utilities - map to component-specific naming
  const getScoreColor = (s) => getScoreColorUtil(s).replace("text-green-400", "text-green-500").replace("text-amber-400", "text-amber-500").replace("text-red-400", "text-red-500");

  const getScoreBg = (s) => `${getScoreBgClass(s).replace("/20", "/10")} ${getScoreBorderClass(s)}`;

  // Size classes
  const sizeClasses = {
    sm: {
      container: "px-2 py-1 text-xs",
      score: "text-sm font-bold",
      name: "text-xs",
      icon: "w-3 h-3",
    },
    md: {
      container: "px-3 py-2 text-sm",
      score: "text-lg font-bold",
      name: "text-sm",
      icon: "w-4 h-4",
    },
    lg: {
      container: "px-4 py-3 text-base",
      score: "text-2xl font-bold",
      name: "text-base",
      icon: "w-5 h-5",
    },
  };

  const sizes = sizeClasses[size] || sizeClasses.md;

  // Shield icon
  const ShieldIcon = ({ className: iconClass }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={iconClass}
    >
      <path
        fillRule="evenodd"
        d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516 11.209 11.209 0 01-7.877-3.08z"
        clipRule="evenodd"
      />
    </svg>
  );

  // Minimal variant - just score inline
  if (variant === "minimal") {
    const content = (
      <span
        className={`inline-flex items-center gap-1 ${getScoreColor(score)} ${className}`}
      >
        <ShieldIcon className={sizes.icon} />
        <span className={sizes.score}>{score}</span>
      </span>
    );

    if (showLink && productSlug) {
      return (
        <Link
          href={`/products/${productSlug}`}
          className="hover:opacity-80 transition-opacity"
          title={`${productName} SafeScore`}
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  // Default variant
  if (variant === "default") {
    const content = (
      <div
        className={`inline-flex items-center gap-2 rounded-lg border ${getScoreBg(score)} ${sizes.container} ${className}`}
      >
        <ShieldIcon className={`${sizes.icon} text-primary`} />
        <span className="text-base-content/70">{productName}</span>
        <span className={`${sizes.score} ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
    );

    if (showLink && productSlug) {
      return (
        <Link
          href={`/products/${productSlug}`}
          className="hover:scale-105 transition-transform inline-block"
          title={`${productName} - SafeScore: ${score}/100`}
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  // Detailed variant - full card
  if (variant === "detailed") {
    const content = (
      <div
        className={`inline-flex flex-col rounded-xl border ${getScoreBg(score)} ${sizes.container} min-w-[140px] ${className}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <ShieldIcon className={`${sizes.icon} text-primary`} />
          <span className="text-xs text-base-content/50 uppercase tracking-wide">
            SafeScore
          </span>
        </div>
        <div className={`${sizes.score} ${getScoreColor(score)} mb-1`}>
          {score}/100
        </div>
        <div className={`${sizes.name} text-base-content font-medium truncate`}>
          {productName}
        </div>
        {type && (
          <div className="text-xs text-base-content/50 mt-1">{type}</div>
        )}
        {showLink && (
          <div className="text-xs text-primary mt-2 flex items-center gap-1">
            {t("product.viewDetails") || "View Details"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    );

    if (showLink && productSlug) {
      return (
        <Link
          href={`/products/${productSlug}`}
          className="hover:scale-105 transition-transform inline-block"
          title={`${productName} - SafeScore: ${score}/100`}
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  return null;
};

/**
 * ScoreBadgeInline - Ultra-compact inline badge for text
 */
export const ScoreBadgeInline = ({ score, className = "" }) => {
  // Use centralized thresholds
  const getInlineBgColor = (s) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium text-white ${getInlineBgColor(score)} ${className}`}
    >
      {score}
    </span>
  );
};

/**
 * ScoreBadgePill - Pill-style badge
 */
export const ScoreBadgePill = ({ productName, score, className = "" }) => {
  // Use centralized thresholds (80/60)
  const getPillColor = (s) => {
    if (s >= 80) return "border-green-500 text-green-500";
    if (s >= 60) return "border-amber-500 text-amber-500";
    return "border-red-500 text-red-500";
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getPillColor(score)} ${className}`}
    >
      <span className="text-base-content text-sm">{productName}</span>
      <span className="font-bold">{score}</span>
    </span>
  );
};

export default ScoreBadge;
