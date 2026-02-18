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
      text: "Excellent",
      short: "SAFE",
      level: "excellent",
      color: "green",
    };
  }
  if (s >= SCORE_THRESHOLDS.GOOD) {
    return {
      text: "Good",
      short: "OK",
      level: "good",
      color: "amber",
    };
  }
  if (s >= SCORE_THRESHOLDS.AVERAGE) {
    return {
      text: "Fair",
      short: "FAIR",
      level: "average",
      color: "orange",
    };
  }
  return {
    text: "Needs Improvement",
    short: "RISKY",
    level: "poor",
    color: "red",
  };
}

/**
 * Get simple verdict label for score.
 *
 * @param {number|null} score - Score value
 * @returns {string} "SAFE", "OK", "FAIR", or "RISKY"
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
