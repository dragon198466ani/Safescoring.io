/**
 * Design tokens for the SAFE scoring system.
 * Single source of truth for pillar colors and metadata used across components.
 * Stays in sync with config.safe.pillars but provides flat, import-friendly access.
 */

export const PILLARS = [
  {
    code: "S",
    name: "Security",
    shortDesc: "Cryptographic foundations",
    primary: "#22c55e",   // green
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-400",
  },
  {
    code: "A",
    name: "Adversity",
    shortDesc: "Threat resistance",
    primary: "#f59e0b",   // amber
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
  },
  {
    code: "F",
    name: "Fidelity",
    shortDesc: "Reliability & trust",
    primary: "#3b82f6",   // blue
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
  },
  {
    code: "E",
    name: "Efficiency",
    shortDesc: "Usability & performance",
    primary: "#8b5cf6",   // purple
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    text: "text-purple-400",
  },
];

/**
 * Quick lookup by pillar code.
 */
export const PILLAR_MAP = Object.fromEntries(
  PILLARS.map((p) => [p.code, p])
);

/**
 * Score tier definitions for consistent color/label across the app.
 */
export const SCORE_TIERS = [
  { min: 80, label: "Excellent", color: "text-green-400", bg: "bg-green-500/10" },
  { min: 60, label: "Good",      color: "text-amber-400", bg: "bg-amber-500/10" },
  { min: 0,  label: "At Risk",   color: "text-red-400",   bg: "bg-red-500/10" },
];

export const getScoreTier = (score) =>
  SCORE_TIERS.find((t) => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];
