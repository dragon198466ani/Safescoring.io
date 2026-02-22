/**
 * Staking Benefits Configuration — AUTONOMOUS TOKEN MODEL
 *
 * Stake $SAFE tokens to unlock features as an ALTERNATIVE to EUR subscription.
 * Pure utility: staking gives feature access, NOT yield/APY.
 *
 * Revenue model:
 *   EUR subscriptions = founder's income (100%)
 *   $SAFE token = separate community economy (0% of EUR)
 *
 * Vote system: 1 person = 1 vote, always. Zero multipliers.
 */

export const STAKING_TIERS = {
  bronze: {
    name: "Bronze",
    minStake: 100,
    color: "#cd7f32",
    icon: "🥉",
    benefits: {
      extraSetups: 1,
      extraProductsPerSetup: 0,
      exportPDF: true,
      apiDailyLimit: 0,
      safebotBonus: 5,
      alerts: false,
      scoreHistory: false,
      comparisons: false,
      prioritySupport: false,
    },
    description: "Unlock PDF export and +1 setup slot",
  },
  silver: {
    name: "Silver",
    minStake: 500,
    color: "#c0c0c0",
    icon: "🥈",
    benefits: {
      extraSetups: 3,
      extraProductsPerSetup: 1,
      exportPDF: true,
      apiDailyLimit: 100,
      safebotBonus: 15,
      alerts: true,
      scoreHistory: false,
      comparisons: false,
      prioritySupport: false,
    },
    description: "API access, alerts, and +3 setup slots",
  },
  gold: {
    name: "Gold",
    minStake: 1000,
    color: "#ffd700",
    icon: "🥇",
    benefits: {
      extraSetups: 5,
      extraProductsPerSetup: 2,
      exportPDF: true,
      apiDailyLimit: 200,
      safebotBonus: 30,
      alerts: true,
      scoreHistory: true,
      comparisons: false,
      prioritySupport: false,
    },
    description: "Score history tracking and +5 setup slots",
  },
  platinum: {
    name: "Platinum",
    minStake: 2500,
    color: "#e5e4e2",
    icon: "💎",
    benefits: {
      extraSetups: 5,
      extraProductsPerSetup: 2,
      exportPDF: true,
      apiDailyLimit: 300,
      safebotBonus: 50,
      alerts: true,
      scoreHistory: true,
      comparisons: true,
      prioritySupport: false,
    },
    description: "Full Explorer features via staking",
  },
  diamond: {
    name: "Diamond",
    minStake: 5000,
    color: "#b9f2ff",
    icon: "💠",
    benefits: {
      extraSetups: 15,
      extraProductsPerSetup: 5,
      exportPDF: true,
      apiDailyLimit: 500,
      safebotBonus: 100,
      alerts: true,
      scoreHistory: true,
      comparisons: true,
      prioritySupport: true,
    },
    description: "Near-Professional features + priority support",
  },
};

// Ordered tiers for iteration (highest first)
export const TIER_ORDER = ["diamond", "platinum", "gold", "silver", "bronze"];

/**
 * Token pass prices (spend via spendAndBurn — 50% burned, 50% recycled)
 */
export const TOKEN_PASSES = {
  explorer_1d: { type: "explorer", duration: "1d", days: 1, cost: 15, label: "Explorer 1 jour" },
  explorer_1w: { type: "explorer", duration: "1w", days: 7, cost: 80, label: "Explorer 1 semaine" },
  explorer_1m: { type: "explorer", duration: "1m", days: 30, cost: 250, label: "Explorer 1 mois" },
  explorer_1y: { type: "explorer", duration: "1y", days: 365, cost: 2000, label: "Explorer 1 an" },
  pro_1d: { type: "pro", duration: "1d", days: 1, cost: 40, label: "Pro 1 jour" },
  pro_1w: { type: "pro", duration: "1w", days: 7, cost: 200, label: "Pro 1 semaine" },
  pro_1m: { type: "pro", duration: "1m", days: 30, cost: 600, label: "Pro 1 mois" },
  pro_1y: { type: "pro", duration: "1y", days: 365, cost: 5000, label: "Pro 1 an" },
  extra_setup: { type: "unlock", duration: "permanent", days: null, cost: 40, label: "+1 Setup permanent" },
};

/**
 * Get staking tier based on total staked amount
 * @param {number} totalStaked - Total $SAFE staked
 * @returns {Object|null} Tier config or null if below minimum
 */
export function getStakingTier(totalStaked) {
  if (!totalStaked || totalStaked < 100) return null;

  for (const tierKey of TIER_ORDER) {
    const tier = STAKING_TIERS[tierKey];
    if (totalStaked >= tier.minStake) {
      return { key: tierKey, ...tier };
    }
  }
  return null;
}

/**
 * Get staking benefits for a user's stake amount
 * @param {number} totalStaked - Total $SAFE staked
 * @returns {Object} Benefits object with all unlocked features
 */
export function getStakingBenefits(totalStaked) {
  const tier = getStakingTier(totalStaked);
  if (!tier) {
    return {
      tier: null,
      extraSetups: 0,
      extraProductsPerSetup: 0,
      exportPDF: false,
      apiDailyLimit: 0,
      safebotBonus: 0,
      alerts: false,
      scoreHistory: false,
      comparisons: false,
      prioritySupport: false,
    };
  }

  return {
    tier: tier.key,
    tierName: tier.name,
    tierIcon: tier.icon,
    tierColor: tier.color,
    ...tier.benefits,
  };
}

/**
 * Calculate progress to next tier
 * @param {number} totalStaked - Current total staked
 * @returns {Object} Progress info
 */
export function getProgressToNextTier(totalStaked) {
  const currentTier = getStakingTier(totalStaked);

  // Find next tier
  let nextTier = null;
  let nextTierKey = null;

  for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
    const tierKey = TIER_ORDER[i];
    const tier = STAKING_TIERS[tierKey];
    if (tier.minStake > (totalStaked || 0)) {
      nextTier = tier;
      nextTierKey = tierKey;
      break;
    }
  }

  if (!nextTier) {
    return {
      currentTier: currentTier?.key || null,
      nextTier: null,
      progress: 100,
      remaining: 0,
      isMaxTier: true,
    };
  }

  const currentMin = currentTier?.minStake || 0;
  const nextMin = nextTier.minStake;
  const progress = ((totalStaked - currentMin) / (nextMin - currentMin)) * 100;

  return {
    currentTier: currentTier?.key || null,
    nextTier: nextTierKey,
    nextTierName: nextTier.name,
    nextTierIcon: nextTier.icon,
    progress: Math.min(100, Math.max(0, progress)),
    remaining: nextMin - totalStaked,
    isMaxTier: false,
  };
}

/**
 * Get the equivalent EUR plan for a staking tier
 * @param {string} tierKey - Staking tier key
 * @returns {string|null} Equivalent plan code
 */
export function getEquivalentPlan(tierKey) {
  const equivalents = {
    bronze: null,         // Partial features only
    silver: null,         // Partial features only
    gold: null,           // Partial features only
    platinum: "explorer", // Equivalent to Explorer plan
    diamond: null,        // Between Explorer and Pro
  };
  return equivalents[tierKey] || null;
}

/**
 * Get value comparison (how much user saves vs paying EUR)
 * @param {number} totalStaked - Total staked
 * @returns {Object} Savings info
 */
export function getStakingSavings(totalStaked) {
  const tier = getStakingTier(totalStaked);
  if (!tier) return { monthlyValue: 0, yearlyValue: 0 };

  const valueMap = {
    bronze: 5,
    silver: 10,
    gold: 15,
    platinum: 19,
    diamond: 35,
  };

  const monthlyValue = valueMap[tier.key] || 0;

  return {
    monthlyValue,
    yearlyValue: monthlyValue * 12,
    tierName: tier.name,
  };
}

/**
 * Calculate weekly reward based on staked amount and tier
 * @param {number} totalStaked - Total $SAFE staked
 * @returns {number} Weekly reward in $SAFE tokens
 */
export function calculateWeeklyReward(totalStaked) {
  const tier = getStakingTier(totalStaked);
  if (!tier) return 0;

  // Base reward rates per tier (weekly % of staked amount)
  const rewardRates = {
    bronze: 0.001,    // 0.1% weekly
    silver: 0.0015,   // 0.15% weekly
    gold: 0.002,      // 0.2% weekly
    platinum: 0.0025, // 0.25% weekly
    diamond: 0.003,   // 0.3% weekly
  };

  const rate = rewardRates[tier.key] || 0;
  return Math.floor(totalStaked * rate);
}

export default {
  STAKING_TIERS,
  TIER_ORDER,
  TOKEN_PASSES,
  getStakingTier,
  getStakingBenefits,
  getProgressToNextTier,
  getEquivalentPlan,
  getStakingSavings,
  calculateWeeklyReward,
};
