import config from "@/config";

// Re-export score utilities so existing imports from design-tokens keep working
export {
  getScoreColor,
  getScoreColorHex,
  getScoreColorHex as getScoreHexColor,
  getScoreBgClass,
  getScoreBgClass as getScoreBgGradient,
  getScoreBorderClass,
  getScoreGradient,
  getScoreRingClass,
  getScoreVerdict,
  getScoreLabel,
  normalizeScore,
  hasScore,
  getChangeIndicator,
  getStatusColorClasses,
} from "@/libs/score-utils";

// Re-export getPillarAdvice (alias for pillar-level verdict)
export { getPillarAdvice } from "@/libs/score-utils";

export const PILLARS = config.safe.pillars.map((p) => ({
  code: p.code,
  name: p.name,
  primary: p.color,
  description: p.description,
  shortDesc: p.shortDesc,
  normCount: p.normCount,
}));

// Pillar color map keyed by code
export const PILLAR_COLORS = Object.fromEntries(
  config.safe.pillars.map((p) => [p.code, p.color])
);
