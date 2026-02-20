import config from "@/config";

export const PILLARS = config.safe.pillars.map((p) => ({
  code: p.code,
  name: p.name,
  primary: p.color,
  description: p.description,
  shortDesc: p.shortDesc,
  normCount: p.normCount,
}));

export const PILLAR_COLORS = {
  S: "#3b82f6",
  A: "#f59e0b",
  F: "#22c55e",
  E: "#a855f7",
};

export function getScoreColor(score) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  if (score >= 40) return "text-orange-500";
  return "text-error";
}

export function getScoreHexColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export function getChangeIndicator(change) {
  if (change > 0) return { icon: "↑", color: "text-success" };
  if (change < 0) return { icon: "↓", color: "text-error" };
  return { icon: "→", color: "text-base-content/50" };
}
