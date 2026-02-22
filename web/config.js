// Sourced stats — single source of truth (update annually)
const STATS = {
  // Source: Chainalysis "Crypto Hacking Stolen Funds 2025" (Dec 2024)
  hackLosses2024: "$2.2 billion",
  hackLosses2024Short: "$2.2B",
  // Source: Cyvers 2024 Web3 Security Report — access control breaches
  accessControlLossPct: "81%",
  // Source: Hacken Q2 2024 Web3 Security Report — ~half of affected projects had audits
  auditedHackedApprox: "nearly half",
  auditedHackedYear: "2024",
};

const config = {
  // REQUIRED
  appName: "SafeScoring",
  // REQUIRED: a short description of your app for SEO tags (can be overwritten)
  appDescription:
    "The first unified security rating for all crypto products. 916 norms. 0 opinion. 1 score. Hardware wallets, software wallets, and DeFi protocols - all evaluated with the same rigorous SAFE methodology.",
  // REQUIRED (no https://, not trialing slash at the end, just the naked domain)
  domainName: "safescoring.io",
  crisp: {
    // Crisp website ID. IF YOU DON'T USE CRISP: just remove this => Then add a support email in this config file (resend.supportEmail) otherwise customer support won't work.
    id: "",
    // Hide Crisp by default, except on route "/". Crisp is toggled with <ButtonSupport/>. If you want to show Crisp on every routes, just remove this below
    onlyShowOnRoutes: ["/"],
  },
  // Lemon Squeezy configuration (replaces Stripe)
  // Set your variant IDs from Lemon Squeezy dashboard
  lemonsqueezy: {
    plans: [
      {
        variantId: "free",
        name: "Free",
        description: "Explore security scores for any crypto product",
        price: 0,
        features: [
          { name: "Browse all product scores" },
          { name: "1 custom setup analysis", highlight: true },
          { name: "See your stack's weak points" },
          { name: "Updated monthly with new products" },
        ],
        limits: {
          monthlyProductViews: 5,
          maxSetups: 1,
          maxProductsPerSetup: 3,
        },
      },
      {
        variantId: process.env.LEMON_SQUEEZY_EXPLORER_VARIANT_ID || "explorer_variant",
        name: "Explorer",
        description: "Compare and optimize your crypto security",
        price: 19,
        priceAnchor: 29,
        trialDays: 14,
        features: [
          { name: "Unlimited product comparisons" },
          { name: "5 setup analyses (5 products each)", highlight: true },
          { name: "Identify your weakest security pillar" },
          { name: "Side-by-side product comparison" },
          { name: "Email support" },
        ],
        limits: {
          monthlyProductViews: -1, // unlimited
          maxSetups: 5,
          maxProductsPerSetup: 5,
        },
      },
      {
        isFeatured: true,
        variantId: process.env.LEMON_SQUEEZY_PRO_VARIANT_ID || "pro_variant",
        name: "Professional",
        description: "Full security intelligence for your crypto stack",
        price: 49,
        priceAnchor: 99,
        trialDays: 14,
        features: [
          { name: "Everything in Explorer" },
          { name: "20 setup analyses (10 products each)", highlight: true },
          { name: "Detailed risk breakdown per setup" },
          { name: "Track score changes over time" },
          { name: "API access for integrations" },
          { name: "Priority support" },
        ],
        limits: {
          monthlyProductViews: -1,
          maxSetups: 20,
          maxProductsPerSetup: 10,
        },
      },
      {
        variantId: process.env.LEMON_SQUEEZY_ENTERPRISE_VARIANT_ID || "enterprise_variant",
        name: "Enterprise",
        description: "Security intelligence at scale",
        price: 299,
        priceAnchor: 499,
        features: [
          { name: "Everything in Professional" },
          { name: "Unlimited setups & products", highlight: true },
          { name: "Share analyses across your team" },
          { name: "Custom scoring for your risk model" },
          { name: "White-label reports for clients" },
          { name: "Dedicated account manager" },
        ],
        limits: {
          monthlyProductViews: -1,
          maxSetups: -1, // unlimited
          maxProductsPerSetup: -1, // unlimited
        },
      },
    ],
  },
  // Legacy Stripe config (kept for reference, can be removed)
  stripe: {
    plans: [],
  },
  aws: {
    // If you use AWS S3/Cloudfront, put values in here
    bucket: "bucket-name",
    bucketUrl: `https://bucket-name.s3.amazonaws.com/`,
    cdn: "https://cdn-id.cloudfront.net/",
  },
  resend: {
    // REQUIRED — Email 'From' field to be used when sending magic login links
    fromNoReply: `SafeScoring <noreply@safescoring.io>`,
    // REQUIRED — Email 'From' field to be used when sending other emails, like abandoned carts, updates etc..
    fromAdmin: `SafeScoring Team <team@safescoring.io>`,
    // Email shown to customer if need support. Leave empty if not needed => if empty, set up Crisp above, otherwise you won't be able to offer customer support."
    supportEmail: "support@safescoring.io",
  },
  colors: {
    // REQUIRED — The DaisyUI theme to use (added to the main layout.js). Leave blank for default (light & dark mode). If you any other theme than light/dark, you need to add it in config.tailwind.js in daisyui.themes.
    theme: "dark",
    // REQUIRED — This color will be reflected on the whole app outside of the document (loading bar, Chrome tabs, etc..). By default it takes the primary color from your DaisyUI theme (make sure to update your the theme name after "data-theme=")
    // OR you can just do this to use a custom color: main: "#f37055". HEX only.
    main: "#6366f1", // Indigo primary color
  },
  auth: {
    // REQUIRED — the path to log in users. It's use to protect private routes (like /dashboard). It's used in apiClient (/libs/api.js) upon 401 errors from our API
    loginUrl: "/api/auth/signin",
    callbackUrl: "/dashboard",
  },
  // SafeScoring specific config
  safe: {
    // Strategic tagline
    tagline: "916 norms. 0 opinion. 1 score.",
    taglineAlt: "Beyond the audit.",

    pillars: [
      {
        code: "S",
        name: "Security",
        description: "Would your wallet survive a state-level attack? We verify encryption, key management, and cryptographic standards — because a single weak algorithm means everything you own is one exploit away from zero.",
        shortDesc: "Cryptographic armor",
        color: "#22c55e", // green
        normCount: 269,
      },
      {
        code: "A",
        name: "Adversity",
        description: "What happens when someone holds a gun to your head? We assess duress protection, anti-coercion mechanisms, time-locks, and physical security — because the real threat to crypto holders is no longer just hackers.",
        shortDesc: "Physical threat & coercion resistance",
        color: "#f59e0b", // amber
        normCount: 193,
      },
      {
        code: "F",
        name: "Fidelity",
        description: `${STATS.auditedHackedApprox} of hacked projects in ${STATS.auditedHackedYear} had been audited. An audit is a snapshot — we measure what happens after. Update frequency, incident response, team track record, and whether they actually fix what breaks.`,
        shortDesc: "Proven reliability over time",
        color: "#3b82f6", // blue
        normCount: 195,
      },
      {
        code: "E",
        name: "Efficiency",
        description: "The most secure wallet is worthless if you send funds to the wrong address because the UI was confusing. We measure whether security actually works in your hands — UX, clarity, multi-chain support, and error prevention.",
        shortDesc: "Security you can actually use",
        color: "#8b5cf6", // purple
        normCount: 259,
      },
    ],
    stats: {
      totalNorms: 916,
      totalProducts: 100,
      totalProductTypes: 21,
      totalEvaluations: 50000,
      // Pillar-specific sourced stats (from STATS constant above)
      ...STATS,
    },
    // Competitive differentiators
    differentiators: [
      {
        title: "Unified Framework",
        description: "The only rating covering hardware, software, AND DeFi with the same methodology",
        icon: "unified",
      },
      {
        title: "Beyond Audits",
        description: `${STATS.auditedHackedApprox} of hacked projects in ${STATS.auditedHackedYear} had been audited. We measure real security.`,
        icon: "beyond",
      },
      {
        title: "Zero Bias",
        description: "Affiliates never influence scores. Methodology is the only factor. 100% independent.",
        icon: "unbiased",
      },
      {
        title: "AI-Powered",
        description: "Automated, reproducible evaluations updated monthly. Not opinions.",
        icon: "ai",
      },
      {
        title: "Physical Threat Defense",
        description: "The only rating that evaluates anti-coercion features: time-locks, duress PINs, hidden wallets. Because kidnappings targeting crypto holders are real.",
        icon: "physical",
      },
    ],
    // Competitor comparison data
    competitors: [
      { name: "CertiK", covers: "Smart contracts only", limitation: "7+ audited projects got hacked" },
      { name: "DeFiSafety", covers: "DeFi protocols only", limitation: "No hardware or software wallets" },
      { name: "CER.live", covers: "Exchanges only", limitation: "No products or protocols" },
      { name: "Reviews", covers: "Subjective opinions", limitation: "Sponsored, not reproducible" },
    ],
  },
  // Company information
  company: {
    name: "SafeScoring",
    legalName: "SafeScoring SAS",
    legalForm: "SAS",
    state: "France",
    country: "France",
    founded: "2024",
    email: "contact@safescoring.io",
  },
  // Freemium configuration
  freemium: {
    monthlyLimit: 5,
    trialDays: 14,
    requireCard: true,
  },
};

export default config;
