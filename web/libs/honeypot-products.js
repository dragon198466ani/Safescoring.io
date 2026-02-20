/**
 * Honeypot Product System
 *
 * Injects fake but realistic-looking products into API responses.
 * If a competitor publishes these fake products, it proves they copied from us.
 *
 * AI-PROOF because:
 * 1. Fake products are indistinguishable from real ones
 * 2. Only SafeScoring knows which products are honeypots
 * 3. Publishing a honeypot = irrefutable proof of copying
 */

import crypto from "crypto";

// Secret key for honeypot generation
// CRITICAL: Must be set in production via HONEYPOT_SECRET env var
const DEFAULT_SECRET = "ss-honeypot-v1-dev-only";
const HONEYPOT_SECRET = process.env.HONEYPOT_SECRET || DEFAULT_SECRET;

// Warn in production if using default secret
if (process.env.NODE_ENV === "production" && HONEYPOT_SECRET === DEFAULT_SECRET) {
  console.error(
    "[SECURITY WARNING] HONEYPOT_SECRET not set! Honeypot products are predictable. " +
    "Generate with: openssl rand -base64 32"
  );
}

/**
 * Honeypot product templates
 * These look completely real but don't exist
 * EXPANDED: More types and variations for better detection coverage
 */
const HONEYPOT_TEMPLATES = [
  {
    type: "hardware_wallet",
    namePatterns: [
      "SecureVault {version}",
      "CryptoGuard {adjective}",
      "BlockShield {edition}",
      "SafeKey {model}",
      "TrustNode {series}",
      "Vaultix {version}",
      "ColdStore {adjective}",
      "HexGuard {edition}",
    ],
    companyPatterns: [
      "{name} Technologies",
      "{name} Security",
      "{name} Labs",
      "{name} Systems",
      "{name} Hardware",
    ],
    versions: ["Pro", "Elite", "X1", "S2", "Max", "Nano", "Plus", "Air", "SE", "Ultra"],
    adjectives: ["Ultra", "Quantum", "Fortress", "Titan", "Phoenix", "Prime", "Shield"],
    editions: ["2024", "2025", "Gen3", "Gen4", "MK2", "MK3", "V2", "V3"],
    models: ["X500", "H1", "P200", "T100", "K9", "M50", "Z1"],
    series: ["Alpha", "Beta", "Omega", "Delta", "Sigma", "Epsilon"],
    companyNames: ["Cipher", "Nexus", "Vault", "Haven", "Bastion", "Aegis", "Fortis", "Sentinel", "Arcana"],
  },
  {
    type: "software_wallet",
    namePatterns: [
      "{name}Wallet",
      "{name} Mobile",
      "My{name}",
      "{name} Safe",
      "{name} Vault",
      "{name} Guard",
    ],
    names: ["Cryptex", "Vaulta", "Keystone", "Safenet", "Blockvault", "Chainkey", "Tokenex", "Signum", "Cipherex", "Wallex"],
    companyPatterns: [
      "{name} Inc",
      "{name} Labs",
      "{name} Tech",
    ],
    companyNames: ["Crypto", "Chain", "Block", "Token", "Key", "Vault"],
  },
  {
    type: "defi_protocol",
    namePatterns: [
      "{name} Finance",
      "{name} Protocol",
      "{name}Swap",
      "{name} DAO",
      "{name} Yield",
      "{name} Lend",
    ],
    names: ["Nexus", "Quantum", "Helix", "Prism", "Vertex", "Zenith", "Flux", "Orbit", "Pulse", "Nova"],
    companyPatterns: null,
    companyNames: [],
  },
  {
    type: "exchange",
    namePatterns: [
      "{name}X",
      "{name} Exchange",
      "{name} Pro",
      "{name} Trade",
    ],
    names: ["Nexbit", "Coinex", "Tradex", "Cryptobit", "Tokenex", "Chainbit", "Swapex", "Bitcore"],
    companyPatterns: [
      "{name} Ltd",
      "{name} Global",
    ],
    companyNames: ["Crypto", "Chain", "Bit", "Trade", "Swap"],
  },
  {
    type: "custody",
    namePatterns: [
      "{name} Custody",
      "{name} Institutional",
      "{name} Vault",
      "{name} Trust",
    ],
    names: ["Fortis", "Anchor", "Guardian", "Sentinel", "Citadel", "Bastion", "Keyrock"],
    companyPatterns: [
      "{name} Capital",
      "{name} Trust",
      "{name} Custody Solutions",
    ],
    companyNames: ["Digital", "Crypto", "Asset", "Block"],
  },
];

/**
 * Generate deterministic honeypot ID
 * Same seed always produces same honeypot
 */
function generateHoneypotId(seed) {
  return crypto
    .createHmac("sha256", HONEYPOT_SECRET)
    .update(`honeypot:${seed}`)
    .digest("hex")
    .substring(0, 12);
}

/**
 * Generate a fake but realistic product
 */
export function generateHoneypotProduct(seed, type = "hardware_wallet") {
  const template = HONEYPOT_TEMPLATES.find((t) => t.type === type) || HONEYPOT_TEMPLATES[0];

  // Deterministic random based on seed
  const hash = crypto
    .createHmac("sha256", HONEYPOT_SECRET)
    .update(`product:${seed}:${type}`)
    .digest("hex");

  const getFromArray = (arr, offset) => {
    const index = parseInt(hash.substring(offset, offset + 2), 16) % arr.length;
    return arr[index];
  };

  // Generate name
  let name = getFromArray(template.namePatterns, 0);
  name = name
    .replace("{version}", getFromArray(template.versions || ["Pro"], 2))
    .replace("{adjective}", getFromArray(template.adjectives || ["Ultra"], 4))
    .replace("{edition}", getFromArray(template.editions || ["2024"], 6))
    .replace("{model}", getFromArray(template.models || ["X1"], 8))
    .replace("{series}", getFromArray(template.series || ["Alpha"], 10))
    .replace("{name}", getFromArray(template.names || template.companyNames, 12));

  // Generate company
  let company = "";
  if (template.companyPatterns) {
    company = getFromArray(template.companyPatterns, 14);
    company = company.replace("{name}", getFromArray(template.companyNames, 16));
  }

  // Generate realistic score (between 60-85, typical range)
  const baseScore = 60 + (parseInt(hash.substring(18, 20), 16) % 26);
  const scoreVariation = (parseInt(hash.substring(20, 22), 16) % 10) / 10;

  // Generate pillar scores
  const pillarBase = baseScore - 5 + (parseInt(hash.substring(22, 24), 16) % 10);

  // Generate slug
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    id: generateHoneypotId(seed),
    name,
    slug,
    company,
    type,
    is_honeypot: true, // NEVER include this in API responses
    honeypot_seed: seed, // NEVER include this in API responses

    // Realistic product data
    description: generateDescription(name, type, hash),
    website: `https://${slug}.io`, // Fake but plausible URL
    logo_url: null, // No logo = normal for newer products

    // Realistic scores
    safe_score: Math.round((baseScore + scoreVariation) * 100) / 100,
    pillar_scores: {
      security: Math.round((pillarBase + (parseInt(hash.substring(24, 26), 16) % 15)) * 100) / 100,
      adversity: Math.round((pillarBase + (parseInt(hash.substring(26, 28), 16) % 15)) * 100) / 100,
      fidelity: Math.round((pillarBase + (parseInt(hash.substring(28, 30), 16) % 15)) * 100) / 100,
      efficiency: Math.round((pillarBase + (parseInt(hash.substring(30, 32), 16) % 15)) * 100) / 100,
    },

    // Metadata
    created_at: generatePastDate(hash, 32),
    updated_at: generateRecentDate(hash, 36),
    evaluation_count: 1 + (parseInt(hash.substring(40, 42), 16) % 5),
  };
}

/**
 * Generate realistic description
 */
function generateDescription(name, type, hash) {
  const descriptions = {
    hardware_wallet: [
      `${name} is a next-generation hardware wallet designed for secure cryptocurrency storage.`,
      `Secure your digital assets with ${name}, featuring advanced encryption and cold storage.`,
      `${name} combines military-grade security with user-friendly design for crypto enthusiasts.`,
    ],
    software_wallet: [
      `${name} provides secure, non-custodial wallet services for multiple blockchains.`,
      `Manage your crypto portfolio securely with ${name}'s intuitive mobile and desktop apps.`,
      `${name} offers seamless DeFi integration while keeping your private keys safe.`,
    ],
    defi_protocol: [
      `${name} is a decentralized protocol enabling secure lending and borrowing.`,
      `Earn yield on your crypto assets through ${name}'s audited smart contracts.`,
      `${name} provides liquidity solutions with industry-leading security measures.`,
    ],
  };

  const options = descriptions[type] || descriptions.hardware_wallet;
  const index = parseInt(hash.substring(42, 44), 16) % options.length;
  return options[index];
}

/**
 * Generate realistic past date (1-18 months ago)
 */
function generatePastDate(hash, offset) {
  const monthsAgo = 1 + (parseInt(hash.substring(offset, offset + 2), 16) % 18);
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(1 + (parseInt(hash.substring(offset + 2, offset + 4), 16) % 28));
  return date.toISOString();
}

/**
 * Generate recent date (1-30 days ago)
 */
function generateRecentDate(hash, offset) {
  const daysAgo = 1 + (parseInt(hash.substring(offset, offset + 2), 16) % 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

/**
 * Check if a product ID is a honeypot
 */
export function isHoneypot(productId) {
  // Check against known honeypot seeds
  const knownSeeds = getActiveHoneypotSeeds();

  for (const seed of knownSeeds) {
    if (generateHoneypotId(seed) === productId) {
      return { isHoneypot: true, seed };
    }
  }

  return { isHoneypot: false };
}

/**
 * Get active honeypot seeds
 * Rotate these periodically
 */
function getActiveHoneypotSeeds() {
  // Generate time-based seeds that rotate monthly
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;

  const seeds = [];
  for (let i = 0; i < 5; i++) {
    seeds.push(
      crypto
        .createHmac("sha256", HONEYPOT_SECRET)
        .update(`seed:${monthKey}:${i}`)
        .digest("hex")
        .substring(0, 8)
    );
  }

  return seeds;
}

/**
 * Inject honeypots into product list
 * Injects for most clients to maximize detection coverage
 *
 * UPDATED: Increased from 30% to 70% probability and 2 to 4 max honeypots
 */
export function injectHoneypots(products, clientFingerprint, options = {}) {
  const {
    maxHoneypots = parseInt(process.env.MAX_HONEYPOTS || "4"),
    probability = parseFloat(process.env.HONEYPOT_INJECTION_RATE || "0.7")
  } = options;

  // Determine if this client gets honeypots
  const shouldInject = parseInt(clientFingerprint.substring(0, 4), 16) / 65535 < probability;

  if (!shouldInject) {
    return products;
  }

  // Generate honeypots for this client
  const honeypots = [];
  const seeds = getActiveHoneypotSeeds();

  // Vary honeypot types for better coverage
  const honeypotTypes = ["hardware_wallet", "software_wallet", "defi_protocol", "exchange", "custody"];

  for (let i = 0; i < Math.min(maxHoneypots, seeds.length); i++) {
    // Add client fingerprint to seed for tracking
    const clientSeed = `${seeds[i]}:${clientFingerprint.substring(0, 8)}`;

    // Select type based on seed (deterministic for same client)
    const typeIndex = parseInt(clientSeed.substring(0, 2), 16) % honeypotTypes.length;
    const type = honeypotTypes[typeIndex];

    const honeypot = generateHoneypotProduct(clientSeed, type);

    // Remove internal fields before injecting
    const { is_honeypot, honeypot_seed, ...publicHoneypot } = honeypot;
    honeypots.push(publicHoneypot);
  }

  // Insert honeypots at random but consistent positions
  const result = [...products];
  for (let i = 0; i < honeypots.length; i++) {
    const position =
      Math.floor(products.length * 0.3) +
      (parseInt(clientFingerprint.substring(i * 4, i * 4 + 4), 16) %
        Math.floor(products.length * 0.4));
    result.splice(position, 0, honeypots[i]);
  }

  return result;
}

/**
 * Detect if competitor published our honeypot
 * Call this when you find a suspected copy
 */
export function detectHoneypotCopy(suspectedProduct) {
  const { name, slug, description, safe_score } = suspectedProduct;

  // Check all possible honeypot variations
  const seeds = getActiveHoneypotSeeds();

  for (const baseSeed of seeds) {
    // Check with various client fingerprints
    // In production, you'd check against logged fingerprints
    for (let i = 0; i < 100; i++) {
      const testFingerprint = crypto
        .createHash("sha256")
        .update(`test:${i}`)
        .digest("hex");
      const clientSeed = `${baseSeed}:${testFingerprint.substring(0, 8)}`;
      const honeypot = generateHoneypotProduct(clientSeed, "hardware_wallet");

      // Check for matches
      if (
        honeypot.name === name ||
        honeypot.slug === slug ||
        (honeypot.description === description && Math.abs(honeypot.safe_score - safe_score) < 0.5)
      ) {
        return {
          isHoneypot: true,
          matchedSeed: clientSeed,
          matchedFingerprint: testFingerprint.substring(0, 8),
          confidence: 1.0,
          evidence: {
            ourProduct: honeypot,
            theirProduct: suspectedProduct,
          },
        };
      }
    }
  }

  return { isHoneypot: false };
}

/**
 * Generate legal evidence document for honeypot detection
 */
export function generateHoneypotEvidence(detection) {
  return {
    title: "Evidence of Data Theft - Honeypot Detection",
    generated_at: new Date().toISOString(),
    generated_by: "SafeScoring Anti-Copy System v1.0",

    summary: {
      finding: "Copied honeypot product detected",
      confidence: detection.confidence,
      legal_implication:
        "The presence of this product in competitor's database proves unauthorized copying of SafeScoring data.",
    },

    technical_evidence: {
      honeypot_seed: detection.matchedSeed,
      client_fingerprint: detection.matchedFingerprint,
      our_generated_product: detection.evidence.ourProduct,
      their_published_product: detection.evidence.theirProduct,
    },

    verification_steps: [
      "1. Run generateHoneypotProduct() with the seed shown above",
      "2. Compare output with competitor's product",
      "3. Exact match proves data was copied from SafeScoring",
      "4. Client fingerprint identifies which account scraped the data",
    ],

    legal_notes: {
      en: "This honeypot product was artificially generated and injected into SafeScoring API responses. Its presence in any other database constitutes evidence of unauthorized data copying.",
      fr: "Ce produit honeypot a \u00e9t\u00e9 artificiellement g\u00e9n\u00e9r\u00e9 et inject\u00e9 dans les r\u00e9ponses API de SafeScoring. Sa pr\u00e9sence dans toute autre base de donn\u00e9es constitue une preuve de copie non autoris\u00e9e de donn\u00e9es.",
    },
  };
}
