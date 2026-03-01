// Shared constants for the Products page and sub-components
import { SCORE_TIERS, SCORE_TIER_IDS } from "@/libs/config-constants";

export const scoreTypes = SCORE_TIER_IDS.map((id) => ({
  id,
  label: SCORE_TIERS[id].label,
  description: `${SCORE_TIERS[id].normPercentage}% of norms`,
}));

export const sortOptions = [
  { id: "score-desc", label: "Highest Score" },
  { id: "score-asc", label: "Lowest Score" },
  { id: "name-asc", label: "Name A-Z" },
  { id: "name-desc", label: "Name Z-A" },
  { id: "recent", label: "Recently Updated" },
];

export const PRODUCTS_PER_PAGE = 25;

// localStorage cache helpers
export const CACHE_KEY = "safescoring_products_cache";
export const CACHE_TYPES_KEY = "safescoring_types_cache";
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getCache = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const setCache = (key, data) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Silently fail if localStorage is full
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};
