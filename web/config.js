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
    "Independent security opinions for crypto products. {totalNorms} criteria. 1 methodology. Hardware wallets, software wallets, and DeFi protocols — all evaluated with the same published SAFE methodology. Scores represent editorial opinions, not guarantees.",
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
          { name: "1 custom scoring weight profile" },
          { name: "See your stack's weak points" },
          { name: "Updated monthly with new products" },
        ],
        limits: {
          monthlyProductViews: 5,
          maxSetups: 1,
          maxProductsPerSetup: 3,
          maxScoringSetups: 1,
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
          { name: "3 custom scoring weight profiles" },
          { name: "Identify your weakest security pillar" },
          { name: "Side-by-side product comparison" },
          { name: "Email support" },
        ],
        limits: {
          monthlyProductViews: -1, // unlimited
          maxSetups: 5,
          maxProductsPerSetup: 5,
          maxScoringSetups: 3,
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
          maxScoringSetups: 3,
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
          { name: "Unlimited custom scoring weight profiles" },
          { name: "Export PDF reports for clients" },
          { name: "Dedicated account manager" },
        ],
        limits: {
          monthlyProductViews: -1,
          maxSetups: -1, // unlimited
          maxProductsPerSetup: -1, // unlimited
          maxScoringSetups: -1, // unlimited
        },
      },
    ],
  },
  // Stripe removed — LemonSqueezy is the primary fiat payment provider
  stripe: { plans: [] },
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
    main: "#d1d5db", // Neutral gray — minimal B&W theme
  },
  auth: {
    // REQUIRED — the path to log in users. It's use to protect private routes (like /dashboard). It's used in apiClient (/libs/api.js) upon 401 errors from our API
    loginUrl: "/api/auth/signin",
    callbackUrl: "/dashboard",
  },
  // Company identity (used on /trust page)
  company: {
    name: "SafeScoring",
    legalForm: "LLC",
    state: "Wyoming",
    country: "United States",
    email: "contact@safescoring.io",
  },
  // SafeScoring specific config
  safe: {
    // Strategic tagline
    tagline: "{totalNorms} criteria. 1 methodology. Independent scores.",
    taglineAlt: "A comprehensive security framework.",

    pillars: [
      {
        code: "S",
        name: "Security",
        description: "Our methodology evaluates encryption, key management, and cryptographic standards — assessing how a product's technical foundations hold up against known attack vectors.",
        shortDesc: "Cryptographic foundations",
        color: "#22c55e", // green
        normCount: 872,
      },
      {
        code: "A",
        name: "Adversity",
        description: "Our methodology assesses duress protection, anti-coercion mechanisms, time-locks, and physical security features — evaluating how products address threats beyond the digital realm.",
        shortDesc: "Physical threat & coercion resistance",
        color: "#f59e0b", // amber
        normCount: 540,
      },
      {
        code: "F",
        name: "Fidelity",
        description: `According to industry reports (source: Hacken Q2 ${STATS.auditedHackedYear}), ${STATS.auditedHackedApprox} of hacked projects had been audited. Our methodology evaluates what happens after audits: update frequency, incident response, team track record, and remediation practices.`,
        shortDesc: "Reliability track record",
        color: "#3b82f6", // blue
        normCount: 346,
      },
      {
        code: "E",
        name: "Efficiency",
        description: "Our methodology evaluates whether security features are usable in practice — UX clarity, multi-chain support, error prevention, and accessibility.",
        shortDesc: "Usability of security features",
        color: "#8b5cf6", // purple
        normCount: 618,
      },
    ],
    stats: {
      totalNorms: 2376,
      totalProducts: 1535,
      totalProductTypes: 78,
      totalEvaluations: 500000,
      // Pillar-specific sourced stats (from STATS constant above)
      ...STATS,
    },
    // Competitive differentiators
    differentiators: [
      {
        title: "Unified Framework",
        description: "A single methodology covering hardware wallets, software wallets, and DeFi protocols",
        icon: "unified",
      },
      {
        title: "Comprehensive Scope",
        description: `Our methodology goes beyond code audits to evaluate ongoing security practices, incident response, and operational resilience.`,
        icon: "beyond",
      },
      {
        title: "Editorial Independence",
        description: "Affiliate relationships are disclosed and never influence scores. Methodology determines all ratings.",
        icon: "unbiased",
      },
      {
        title: "AI-Assisted Evaluation",
        description: "Automated, reproducible evaluations updated monthly based on our published methodology.",
        icon: "ai",
      },
      {
        title: "Physical Threat Assessment",
        description: "Our methodology includes evaluation of anti-coercion features: time-locks, duress PINs, and hidden wallets.",
        icon: "physical",
      },
    ],
    // Other approaches in the industry (factual, non-disparaging)
    competitors: [
      { name: "Smart Contract Auditors", covers: "Smart contracts", limitation: "Scope limited to code review" },
      { name: "DeFi Evaluators", covers: "DeFi protocols", limitation: "Typically do not cover hardware/software wallets" },
      { name: "Exchange Raters", covers: "Exchanges", limitation: "Typically do not cover protocols or wallets" },
      { name: "User Reviews", covers: "General opinions", limitation: "Methodology varies" },
    ],
  },
  // Freemium configuration
  freemium: {
    monthlyLimit: 5,
    trialDays: 14,
    requireCard: true,
  },
};

export default config;
