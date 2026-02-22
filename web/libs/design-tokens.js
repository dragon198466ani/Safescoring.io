import config from "@/config";

export const PILLARS = config.safe.pillars.map((p) => ({
  code: p.code,
  name: p.name,
  primary: p.color,
  description: p.description,
  shortDesc: p.shortDesc,
  normCount: p.normCount,
}));

export const PILLAR_COLORS = Object.fromEntries(
  config.safe.pillars.map((p) => [p.code, p.color])
);

export function getScoreColor(score) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export function getScoreHexColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

export function getChangeIndicator(change) {
  if (change > 0) return { text: `+${change}`, color: "text-green-400" };
  if (change < 0) return { text: `${change}`, color: "text-red-400" };
  return { text: "0", color: "text-base-content/50" };
}
