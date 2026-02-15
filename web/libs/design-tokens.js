import config from "@/config";

// Re-export pillars with design-token compatible property names
export const PILLARS = config.safe.pillars.map((pillar) => ({
  ...pillar,
  primary: pillar.color,
}));
