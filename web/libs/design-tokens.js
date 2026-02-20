import config from "@/config";

export const PILLARS = config.safe.pillars.map((p) => ({
  code: p.code,
  name: p.name,
  primary: p.color,
  description: p.description,
  shortDesc: p.shortDesc,
  normCount: p.normCount,
}));
