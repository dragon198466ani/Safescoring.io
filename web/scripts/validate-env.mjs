#!/usr/bin/env node

/**
 * Environment Variable Validator for SafeScoring
 *
 * Checks all required/optional env vars and reports status.
 * Run via: npm run validate-env
 * Also runs automatically at build time.
 */

const ENV_GROUPS = {
  "Supabase (CRITICAL)": {
    required: true,
    vars: [
      "SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
  },
  "Authentication (CRITICAL)": {
    required: true,
    vars: ["NEXTAUTH_SECRET", "NEXTAUTH_URL"],
  },
  "Cron Security (REQUIRED)": {
    required: true,
    vars: ["CRON_SECRET"],
  },
  "Email (REQUIRED for notifications)": {
    required: false,
    vars: ["RESEND_API_KEY"],
  },
  "Google OAuth": {
    required: false,
    vars: ["GOOGLE_ID", "GOOGLE_SECRET"],
  },
  "Stripe Payments": {
    required: false,
    vars: ["STRIPE_PUBLIC_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  "LemonSqueezy Payments": {
    required: false,
    vars: ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_WEBHOOK_SECRET"],
  },
  "Redis Rate Limiting": {
    required: false,
    vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  "Sentry Monitoring": {
    required: false,
    vars: ["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN"],
  },
  "AI Providers": {
    required: false,
    vars: [
      "MISTRAL_API_KEY",
      "GOOGLE_API_KEY_1",
      "GROQ_API_KEY",
      "CEREBRAS_API_KEY",
      "DEEPSEEK_API_KEY",
    ],
  },
  "Web3 / Crypto": {
    required: false,
    vars: [
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID",
      "POLYGON_RPC_URL",
    ],
  },
};

let warnings = 0;
let criticals = 0;

console.log("\n========================================");
console.log("  SafeScoring Environment Validation");
console.log("========================================\n");

for (const [group, config] of Object.entries(ENV_GROUPS)) {
  const missing = config.vars.filter((v) => !process.env[v]);
  const present = config.vars.filter((v) => process.env[v]);

  if (missing.length === 0) {
    console.log(`  ✅ ${group}: ${present.length}/${config.vars.length} configured`);
  } else if (config.required) {
    console.log(`  ❌ ${group}: MISSING ${missing.length} required vars`);
    missing.forEach((v) => console.log(`     → ${v}`));
    criticals += missing.length;
  } else {
    console.log(`  ⚠️  ${group}: ${missing.length} optional vars not set`);
    missing.forEach((v) => console.log(`     → ${v}`));
    warnings += missing.length;
  }
}

console.log("\n----------------------------------------");
if (criticals > 0) {
  console.log(`  ❌ ${criticals} CRITICAL vars missing — some features will not work`);
} else {
  console.log("  ✅ All critical environment variables are set");
}
if (warnings > 0) {
  console.log(`  ⚠️  ${warnings} optional vars not set (features will degrade gracefully)`);
}
console.log("----------------------------------------\n");

// Always exit 0 — don't block deploys
process.exit(0);
