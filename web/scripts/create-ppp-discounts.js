#!/usr/bin/env node

/**
 * PPP Discount Setup Script
 *
 * Creates 4 Lemon Squeezy discount codes for PPP pricing tiers.
 * Run once: node web/scripts/create-ppp-discounts.js
 *
 * Requires:
 *   LEMON_SQUEEZY_API_KEY — your Lemon Squeezy API key
 *   LEMON_SQUEEZY_STORE_ID — your Lemon Squeezy store ID
 *
 * After running, add the output codes to your .env:
 *   PPP_DISCOUNT_TIER1=...
 *   PPP_DISCOUNT_TIER2=...
 *   PPP_DISCOUNT_TIER3=...
 *   PPP_DISCOUNT_TIER4=...
 */

const API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;

if (!API_KEY || !STORE_ID) {
  console.error("❌ Missing required env vars:");
  console.error("   LEMON_SQUEEZY_API_KEY — your API key from Lemon Squeezy dashboard");
  console.error("   LEMON_SQUEEZY_STORE_ID — your store ID");
  console.error("");
  console.error("Usage: LEMON_SQUEEZY_API_KEY=xxx LEMON_SQUEEZY_STORE_ID=yyy node web/scripts/create-ppp-discounts.js");
  process.exit(1);
}

const TIERS = [
  { name: "PPP Tier 1 (20% off)", amount: 20, envKey: "PPP_DISCOUNT_TIER1" },
  { name: "PPP Tier 2 (40% off)", amount: 40, envKey: "PPP_DISCOUNT_TIER2" },
  { name: "PPP Tier 3 (60% off)", amount: 60, envKey: "PPP_DISCOUNT_TIER3" },
  { name: "PPP Tier 4 (80% off)", amount: 80, envKey: "PPP_DISCOUNT_TIER4" },
];

function generateCode(tier) {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PPP_T${tier}_${rand}`;
}

async function createDiscount(tier, index) {
  const code = generateCode(index + 1);

  const response = await fetch("https://api.lemonsqueezy.com/v1/discounts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "discounts",
        attributes: {
          name: tier.name,
          code,
          amount: tier.amount,
          amount_type: "percent",
          duration: "forever", // Apply to all future renewals
          is_limited_to_products: false, // Apply to all products
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: STORE_ID,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to create discount "${tier.name}": ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`
    );
  }

  const data = await response.json();
  return {
    ...tier,
    code,
    id: data.data.id,
  };
}

async function main() {
  console.log("🌍 Creating PPP discount codes on Lemon Squeezy...\n");

  const results = [];

  for (let i = 0; i < TIERS.length; i++) {
    try {
      const result = await createDiscount(TIERS[i], i);
      results.push(result);
      console.log(`✅ ${result.name}: ${result.code} (ID: ${result.id})`);
    } catch (error) {
      console.error(`❌ ${TIERS[i].name}: ${error.message}`);
    }
  }

  if (results.length > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("Add these to your .env file:\n");
    for (const r of results) {
      console.log(`${r.envKey}=${r.code}`);
    }
    console.log("\n" + "=".repeat(60));
    console.log("\nAlso add them to Vercel:");
    for (const r of results) {
      console.log(`  vercel env add ${r.envKey}`);
    }
  }

  console.log("\n✨ Done! Don't forget to also create surcharge variants (+20%, +40%) manually in Lemon Squeezy dashboard.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
