/**
 * Unified Access Control
 * Checks access from multiple sources: Supabase subscription, Stripe, LemonSqueezy, NFT
 */

import { createClient } from "@supabase/supabase-js";
import { checkNFTAccess } from "./contracts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Plan hierarchy (higher = more access)
const PLAN_HIERARCHY = {
  free: 0,
  explorer: 1,
  professional: 2,
  enterprise: 3,
};

// NFT tier to plan mapping
const NFT_TIER_TO_PLAN = {
  Explorer: "explorer",
  Professional: "professional",
  Enterprise: "enterprise",
};

/**
 * Check unified access for a user
 * Combines: Supabase subscription + Stripe + LemonSqueezy + NFT
 *
 * @param {Object} options
 * @param {string} options.userId - Supabase user ID
 * @param {string} options.walletAddress - Ethereum wallet address (optional)
 * @param {string} options.requiredPlan - Minimum required plan (optional)
 * @returns {Object} Access information
 */
export async function checkUnifiedAccess({
  userId,
  walletAddress,
  requiredPlan = "free",
}) {
  const results = {
    hasAccess: false,
    plan: "free",
    planLevel: 0,
    sources: [],
    expiresAt: null,
    isLifetime: false,
  };

  const requiredLevel = PLAN_HIERARCHY[requiredPlan] || 0;

  // 1. Check Supabase/Stripe/LemonSqueezy subscription
  if (userId && supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: user } = await supabase
        .from("users")
        .select("plan_type, has_access, price_id, wallet_address")
        .eq("id", userId)
        .single();

      if (user) {
        const userPlan = user.plan_type?.toLowerCase() || "free";
        const userLevel = PLAN_HIERARCHY[userPlan] || 0;

        if (user.has_access && userLevel > results.planLevel) {
          results.plan = userPlan;
          results.planLevel = userLevel;
          results.sources.push("subscription");
        }

        // Get wallet from user profile if not provided
        if (!walletAddress && user.wallet_address) {
          walletAddress = user.wallet_address;
        }
      }

      // Check active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_type, status, current_period_end")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (subscription) {
        const subPlan = subscription.plan_type?.toLowerCase() || "free";
        const subLevel = PLAN_HIERARCHY[subPlan] || 0;

        if (subLevel > results.planLevel) {
          results.plan = subPlan;
          results.planLevel = subLevel;
          results.expiresAt = subscription.current_period_end;
          if (!results.sources.includes("subscription")) {
            results.sources.push("subscription");
          }
        }
      }
    } catch (error) {
      console.error("Error checking Supabase access:", error);
    }
  }

  // 2. Check NFT access (if wallet address available)
  if (walletAddress) {
    try {
      const nftAccess = await checkNFTAccess(walletAddress, 0);

      if (nftAccess.hasNFT) {
        const nftPlan = NFT_TIER_TO_PLAN[nftAccess.tier] || "explorer";
        const nftLevel = PLAN_HIERARCHY[nftPlan] || 0;

        if (nftLevel > results.planLevel) {
          results.plan = nftPlan;
          results.planLevel = nftLevel;
          results.isLifetime = true;
          results.expiresAt = null; // NFT = lifetime
        }

        results.sources.push("nft");
        results.nftTier = nftAccess.tier;
      }
    } catch (error) {
      console.error("Error checking NFT access:", error);
    }
  }

  // Determine final access
  results.hasAccess = results.planLevel >= requiredLevel;

  return results;
}

/**
 * Get plan limits based on plan type
 */
export function getPlanLimits(plan) {
  const limits = {
    free: {
      monthlyProductViews: 5,
      maxSetups: 1,
      maxProductsPerSetup: 3,
      apiAccess: false,
      exportPDF: false,
      alerts: false,
    },
    explorer: {
      monthlyProductViews: -1, // unlimited
      maxSetups: 5,
      maxProductsPerSetup: 5,
      apiAccess: false,
      exportPDF: true,
      alerts: true,
    },
    professional: {
      monthlyProductViews: -1,
      maxSetups: 20,
      maxProductsPerSetup: 10,
      apiAccess: true,
      exportPDF: true,
      alerts: true,
    },
    enterprise: {
      monthlyProductViews: -1,
      maxSetups: -1,
      maxProductsPerSetup: -1,
      apiAccess: true,
      exportPDF: true,
      alerts: true,
      whiteLabel: true,
    },
  };

  return limits[plan] || limits.free;
}

/**
 * Link wallet address to user account
 */
export async function linkWalletToUser(userId, walletAddress) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabase
    .from("users")
    .update({ wallet_address: walletAddress.toLowerCase() })
    .eq("id", userId);

  if (error) throw error;

  return true;
}
