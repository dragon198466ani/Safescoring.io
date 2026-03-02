/**
 * SCORE UTILITIES - Single Source of Truth
 * =========================================
 * All score handling, formatting, and threshold logic in one place.
 * Import this everywhere instead of defining inline.
 */

// =============================================================================
// SCORE THRESHOLDS (used for coloring, badges, verdicts)
// =============================================================================

export const SCORE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  AVERAGE: 40,
  POOR: 20,
};

// =============================================================================
// PILLAR DEFINITIONS
// =============================================================================

export const PILLAR_CODES = ["S", "A", "F", "E"];

export const PILLARS = [
  { code: "S", name: "Security", nameShort: "Sec" },
  { code: "A", name: "Adversity", nameShort: "Adv" },
  { code: "F", name: "Fidelity", nameShort: "Fid" },
  { code: "E", name: "Ecosystem", nameShort: "Eco" },
];

// =============================================================================
// NULL HANDLING - Consistent across app
// =============================================================================

/**
 * Check if a score exists (is not null/undefined/NaN).
 * Use this to determine if product is evaluated.
 *
 * @param {number|null|undefined} score - Raw score
 * @returns {boolean} true if score exists and is a valid number
 */
export function hasScore(score) {
  return score !== null && score !== undefined && !isNaN(score);
}

/**
 * Normalize a score value to a safe number for DISPLAY.
 * Use this when you need a number (charts, circles, etc.)
 *
 * @param {number|null|undefined} score - Raw score from API/DB
 * @returns {number} 0-100 number, defaults to 0 if null/undefined
 */
export function normalizeScore(score) {
  if (!hasScore(score)) {
    return 0;
  }
  return Math.round(Number(score));
}

/**
 * Get score for API response (preserves null for unevaluated).
 * Use this in API routes to maintain null distinction.
 *
 * @param {number|null|undefined} score - Raw score
 * @returns {number|null} Rounded score or null if not evaluated
 */
export function formatScoreForApi(score) {
  if (!hasScore(score)) return null;
  return Math.round(Number(score));
}

/**
 * Format score for display with fallback text.
 *
 * @param {number|null|undefined} score - Raw score
 * @param {string} fallback - Text to show if no score (default: "N/A")
 * @returns {string} Formatted score or fallback
 */
export function formatScoreDisplay(score, fallback = "N/A") {
  if (!hasScore(score)) return fallback;
  return String(Math.round(Number(score)));
}

// =============================================================================
// PILLAR UTILITIES
// =============================================================================

/**
 * Get pillar score from scores object.
 * Handles case-insensitive lookup (both 's' and 'S' work).
 *
 * @param {Object} scores - Scores object {s, a, f, e} or {S, A, F, E} or mixed
 * @param {string} pillarCode - 'S', 'A', 'F', or 'E' (case-insensitive)
 * @returns {number} Score value (0 if not found or null)
 */
export function getPillarScore(scores, pillarCode) {
  if (!scores || !pillarCode) return 0;

  const upperCode = pillarCode.toUpperCase();
  const lowerCode = pillarCode.toLowerCase();

  // Try lowercase first (most common in API responses), then uppercase
  const value = scores[lowerCode] ?? scores[upperCode] ?? null;
  return normalizeScore(value);
}

/**
 * Check if pillar has a score.
 *
 * @param {Object} scores - Scores object
 * @param {string} pillarCode - Pillar code
 * @returns {boolean} true if pillar has valid score
 */
export function hasPillarScore(scores, pillarCode) {
  if (!scores || !pillarCode) return false;

  const upperCode = pillarCode.toUpperCase();
  const lowerCode = pillarCode.toLowerCase();

  const value = scores[lowerCode] ?? scores[upperCode] ?? null;
  return hasScore(value);
}

/**
 * Normalize scores object to consistent format.
 * Always returns lowercase keys with rounded numbers.
 *
 * @param {Object} rawScores - Raw scores from API/DB (any format)
 * @returns {Object} Normalized {total, s, a, f, e, _hasData}
 */
export function normalizeScoresObject(rawScores) {
  if (!rawScores) {
    return { total: 0, s: 0, a: 0, f: 0, e: 0, _hasData: false };
  }

  // Handle different field names from DB vs API
  const total = rawScores.total ?? rawScores.note_finale ?? null;

  return {
    total: normalizeScore(total),
    s: normalizeScore(rawScores.s ?? rawScores.score_s ?? rawScores.S),
    a: normalizeScore(rawScores.a ?? rawScores.score_a ?? rawScores.A),
    f: normalizeScore(rawScores.f ?? rawScores.score_f ?? rawScores.F),
    e: normalizeScore(rawScores.e ?? rawScores.score_e ?? rawScores.E),
    _hasData: hasScore(total),
  };
}

/**
 * Format scores object for API response.
 * Preserves null for unevaluated scores.
 *
 * @param {Object} rawScores - Raw scores from DB
 * @returns {Object} API-ready {total, s, a, f, e}
 */
export function formatScoresForApi(rawScores) {
  if (!rawScores) {
    return { total: null, s: null, a: null, f: null, e: null };
  }

  return {
    total: formatScoreForApi(rawScores.total ?? rawScores.note_finale),
    s: formatScoreForApi(rawScores.s ?? rawScores.score_s),
    a: formatScoreForApi(rawScores.a ?? rawScores.score_a),
    f: formatScoreForApi(rawScores.f ?? rawScores.score_f),
    e: formatScoreForApi(rawScores.e ?? rawScores.score_e),
  };
}

// =============================================================================
// COLOR UTILITIES (consolidated from design-tokens, ScoreBadge, ScoreCircle)
// =============================================================================

/**
 * Get Tailwind text color class for score.
 *
 * @param {number|null} score - Score value
 * @returns {string} Tailwind class (text-green-400, text-amber-400, or text-red-400)
 */
export function getScoreColor(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return "text-green-400";
  if (s >= SCORE_THRESHOLDS.GOOD) return "text-amber-400";
  return "text-red-400";
}

/**
 * Get hex color for score (for SVG, canvas, etc.)
 *
 * @param {number|null} score - Score value
 * @returns {string} Hex color (#22c55e, #f59e0b, or #ef4444)
 */
export function getScoreColorHex(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return "#22c55e"; // green-500
  if (s >= SCORE_THRESHOLDS.GOOD) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

/**
 * Get Tailwind background class for score.
 *
 * @param {number|null} score - Score value
 * @returns {string} Tailwind class with opacity
 */
export function getScoreBgClass(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return "bg-green-500/20";
  if (s >= SCORE_THRESHOLDS.GOOD) return "bg-amber-500/20";
  return "bg-red-500/20";
}

/**
 * Get Tailwind border class for score.
 *
 * @param {number|null} score - Score value
 * @returns {string} Tailwind border class
 */
export function getScoreBorderClass(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return "border-green-500/30";
  if (s >= SCORE_THRESHOLDS.GOOD) return "border-amber-500/30";
  return "border-red-500/30";
}

/**
 * Get gradient classes for score backgrounds.
 *
 * @param {number|null} score - Score value
 * @returns {string} Combined Tailwind gradient + border classes
 */
export function getScoreGradient(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) {
    return "from-green-500/20 to-green-500/5 border-green-500/30";
  }
  if (s >= SCORE_THRESHOLDS.GOOD) {
    return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
  }
  return "from-red-500/20 to-red-500/5 border-red-500/30";
}

/**
 * Get ring color class for focus states.
 *
 * @param {number|null} score - Score value
 * @returns {string} Tailwind ring class
 */
export function getScoreRingClass(score) {
  const s = normalizeScore(score);
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return "ring-green-500/50";
  if (s >= SCORE_THRESHOLDS.GOOD) return "ring-amber-500/50";
  return "ring-red-500/50";
}

// =============================================================================
// VERDICT UTILITIES
// =============================================================================

/**
 * Get verdict object for score.
 *
 * @param {number|null} score - Score value
 * @returns {Object} {text, short, level, color}
 */
export function getScoreVerdict(score) {
  const s = normalizeScore(score);

  if (s >= SCORE_THRESHOLDS.EXCELLENT) {
    return {
      text: "High Score",
      short: "HIGH",
      level: "excellent",
      color: "green",
    };
  }
  if (s >= SCORE_THRESHOLDS.GOOD) {
    return {
      text: "Moderate Score",
      short: "MOD",
      level: "good",
      color: "amber",
    };
  }
  if (s >= SCORE_THRESHOLDS.AVERAGE) {
    return {
      text: "Below Average",
      short: "LOW",
      level: "average",
      color: "orange",
    };
  }
  return {
    text: "Needs Improvement",
    short: "REVIEW",
    level: "poor",
    color: "red",
  };
}

/**
 * Get simple verdict label for score.
 *
 * @param {number|null} score - Score value
 * @returns {string} "HIGH", "MOD", "LOW", or "REVIEW"
 */
export function getScoreLabel(score) {
  return getScoreVerdict(score).short;
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

/**
 * Compare two scores for sorting (handles null).
 * Null scores are sorted to the end.
 *
 * @param {number|null} a - First score
 * @param {number|null} b - Second score
 * @param {string} direction - 'asc' or 'desc' (default: 'desc')
 * @returns {number} Sort comparison result
 */
export function compareScores(a, b, direction = "desc") {
  const aHas = hasScore(a);
  const bHas = hasScore(b);

  // Null scores go to end
  if (!aHas && !bHas) return 0;
  if (!aHas) return 1;
  if (!bHas) return -1;

  const diff = normalizeScore(a) - normalizeScore(b);
  return direction === "desc" ? -diff : diff;
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate that a score is within valid range.
 *
 * @param {number|null} score - Score to validate
 * @returns {boolean} true if valid (0-100 or null)
 */
export function isValidScore(score) {
  if (score === null || score === undefined) return true;
  const n = Number(score);
  return !isNaN(n) && n >= 0 && n <= 100;
}

/**
 * Clamp score to valid range.
 *
 * @param {number} score - Score to clamp
 * @returns {number} Score clamped to 0-100
 */
export function clampScore(score) {
  if (!hasScore(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(Number(score))));
}

// =============================================================================
// CHANGE INDICATOR (for watchlists, score history)
// =============================================================================

/**
 * Get a change indicator object comparing old vs new score.
 *
 * @param {number|null} current - Current score
 * @param {number|null} previous - Previous score
 * @returns {Object} { delta, direction, icon, color, label }
 */
export function getChangeIndicator(current, previous) {
  if (!hasScore(current) || !hasScore(previous)) {
    return { delta: 0, direction: "stable", icon: "—", color: "text-base-content/40", label: "N/A" };
  }
  const delta = normalizeScore(current) - normalizeScore(previous);
  if (delta > 0) {
    return { delta, direction: "up", icon: "\u25B2", color: "text-green-400", label: `+${delta}` };
  }
  if (delta < 0) {
    return { delta, direction: "down", icon: "\u25BC", color: "text-red-400", label: `${delta}` };
  }
  return { delta: 0, direction: "stable", icon: "=", color: "text-base-content/40", label: "0" };
}

// =============================================================================
// STATUS COLOR CLASSES (for Alert component)
// =============================================================================

/**
 * Get Tailwind color classes for a status string.
 *
 * @param {string} status - "success", "warning", "error", "info"
 * @returns {Object} { bg, text, border }
 */
export function getStatusColorClasses(status) {
  switch (status) {
    case "success":
      return { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30" };
    case "warning":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    case "error":
      return { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" };
    default:
      return { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" };
  }
}

// =============================================================================
// PILLAR ADVICE (used by SAFEBreakdown, SAFEAnalysis)
// =============================================================================

/**
 * Get advice text for a pillar based on its score.
 *
 * @param {string} pillarCode - "S", "A", "F", or "E"
 * @param {number|null} score - Pillar score
 * @returns {string} Advice text
 */
export function getPillarAdvice(pillarCode, score) {
  const s = normalizeScore(score);
  const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };
  const name = pillarNames[pillarCode?.toUpperCase()] || pillarCode;
  if (s >= SCORE_THRESHOLDS.EXCELLENT) return `Strong ${name} posture. Continue monitoring for changes.`;
  if (s >= SCORE_THRESHOLDS.GOOD) return `Decent ${name} score. Review weak norms for improvement opportunities.`;
  if (s >= SCORE_THRESHOLDS.AVERAGE) return `${name} needs attention. Consider alternatives with stronger ${name.toLowerCase()} ratings.`;
  return `Critical ${name} weakness. Immediate risk — evaluate safer alternatives.`;
}

// =============================================================================
// SCORE TIER UTILITIES (Full / Consumer / Essential)
// =============================================================================

/**
 * Extract scores for a specific tier from a raw safe_scoring_results row.
 * Works with both DB column names and API response format.
 *
 * @param {Object} rawScoring - Raw safe_scoring_results row from DB, or product API response
 * @param {string} tierId - "full", "consumer", or "essential" (default: "full")
 * @returns {Object} { total, s, a, f, e, _hasData }
 */
export function getScoresForTier(rawScoring, tierId = "full") {
  if (!rawScoring) {
    return { total: 0, s: 0, a: 0, f: 0, e: 0, _hasData: false };
  }

  // Map tier to field names
  const fieldMap = {
    full: {
      total: ["note_finale", "total"],
      s: ["score_s", "s"],
      a: ["score_a", "a"],
      f: ["score_f", "f"],
      e: ["score_e", "e"],
    },
    consumer: {
      total: ["note_consumer"],
      s: ["s_consumer"],
      a: ["a_consumer"],
      f: ["f_consumer"],
      e: ["e_consumer"],
    },
    essential: {
      total: ["note_essential"],
      s: ["s_essential"],
      a: ["a_essential"],
      f: ["f_essential"],
      e: ["e_essential"],
    },
  };

  const fields = fieldMap[tierId] || fieldMap.full;

  const resolve = (keys) => {
    for (const key of keys) {
      if (rawScoring[key] !== undefined && rawScoring[key] !== null) {
        return rawScoring[key];
      }
    }
    return null;
  };

  const total = resolve(fields.total);

  return {
    total: normalizeScore(total),
    s: normalizeScore(resolve(fields.s)),
    a: normalizeScore(resolve(fields.a)),
    f: normalizeScore(resolve(fields.f)),
    e: normalizeScore(resolve(fields.e)),
    _hasData: hasScore(total),
  };
}

/**
 * Extract scores for a specific tier from a product object
 * that already has structured scores (from API response).
 *
 * Works with the format returned by /api/products/[slug]:
 *   { scores: { total, s, a, f, e, consumer: {...}, essential: {...} } }
 * And with the format returned by /api/products:
 *   { scores: {...}, consumerScores: {...}, essentialScores: {...} }
 *
 * @param {Object} product - Product object from API
 * @param {string} tierId - "full", "consumer", or "essential"
 * @returns {Object} { total, s, a, f, e }
 */
export function getProductScoresForTier(product, tierId = "full") {
  if (!product) return { total: 0, s: 0, a: 0, f: 0, e: 0 };

  switch (tierId) {
    case "consumer":
      // Check nested format first (from /api/products/[slug])
      if (product.scores?.consumer) {
        return product.scores.consumer;
      }
      // Then check flat format (from /api/products)
      return product.consumerScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };

    case "essential":
      if (product.scores?.essential) {
        return product.scores.essential;
      }
      return product.essentialScores || { total: 0, s: 0, a: 0, f: 0, e: 0 };

    default: // "full"
      // Return top-level scores (excluding consumer/essential sub-objects)
      return {
        total: product.scores?.total ?? 0,
        s: product.scores?.s ?? 0,
        a: product.scores?.a ?? 0,
        f: product.scores?.f ?? 0,
        e: product.scores?.e ?? 0,
      };
  }
}

/**
 * Get a short badge label for a score tier.
 *
 * @param {string} tierId - "full", "consumer", or "essential"
 * @returns {Object} { label, color, bgClass }
 */
export function getTierBadge(tierId) {
  switch (tierId) {
    case "essential":
      return {
        label: "Essential",
        color: "text-red-400",
        bgClass: "bg-red-500/10 border-red-500/20",
      };
    case "consumer":
      return {
        label: "Consumer",
        color: "text-blue-400",
        bgClass: "bg-blue-500/10 border-blue-500/20",
      };
    default:
      return {
        label: "Full",
        color: "text-green-400",
        bgClass: "bg-green-500/10 border-green-500/20",
      };
  }
}
