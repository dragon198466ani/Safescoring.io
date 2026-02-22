import config from "@/config";

// ─── Pillar data ──────────────────────────────────────────────
export const PILLARS = config.safe.pillars.map((p) => ({
  code: p.code,
  name: p.name,
  primary: p.color,
  description: p.description,
  shortDesc: p.shortDesc,
  normCount: p.normCount,
}));

// Quick lookup: code → pillar object
export const PILLAR_MAP = Object.fromEntries(
  PILLARS.map((p) => [p.code, p])
);

// Mapping from pillar letter to i18n key
export const PILLAR_KEY_MAP = {
  S: "security",
  A: "adversity",
  F: "fidelity",
  E: "efficiency",
};

// ─── Re-exports from score-utils (single import point) ───────
export {
  getScoreColor,
  getScoreColorHex,
  getScoreBgClass,
  getScoreBorderClass,
  getScoreVerdict,
  normalizeScore,
  SCORE_THRESHOLDS,
} from "@/libs/score-utils";

// ─── Pillar color constants ──────────────────────────────────
export const PILLAR_COLORS = {
  S: "#22c55e", // green-500
  A: "#f59e0b", // amber-500
  F: "#3b82f6", // blue-500
  E: "#8b5cf6", // violet-500
};

// ─── Card style helpers ──────────────────────────────────────
export const CARD_BASE = "rounded-xl bg-base-200 border border-base-300";
export const CARD_HOVER = `${CARD_BASE} hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all`;
export const CARD_INTERACTIVE = `${CARD_HOVER} cursor-pointer`;

// ─── Score background helpers (for comparison / setup cards) ─
export const getScoreBg = (score) => {
  if (score >= 80) return "bg-green-500/15 border-green-500/30";
  if (score >= 60) return "bg-amber-500/15 border-amber-500/30";
  return "bg-red-500/15 border-red-500/30";
};

// ─── Role labels (for setup cards) ──────────────────────────
export const ROLE_LABELS = {
  wallet: { label: "Wallet", color: "bg-purple-500/20 text-purple-400" },
  exchange: { label: "Exchange", color: "bg-blue-500/20 text-blue-400" },
  defi: { label: "DeFi", color: "bg-green-500/20 text-green-400" },
  other: { label: "Other", color: "bg-base-300 text-base-content/60" },
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || ROLE_LABELS.other;
