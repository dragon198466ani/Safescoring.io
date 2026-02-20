/**
 * Intent detection for the autonomous chatbot
 * Identifies user intent to route to appropriate data sources
 */

// Intent types
export const INTENTS = {
  PRODUCT_SCORE: "PRODUCT_SCORE",           // "Score de Ledger?"
  PRODUCT_COMPARE: "PRODUCT_COMPARE",       // "Ledger vs Trezor"
  SECURITY_ADVICE: "SECURITY_ADVICE",       // "Comment sécuriser mes BTC?"
  NORM_QUESTION: "NORM_QUESTION",           // "C'est quoi le Secure Element?"
  RECOMMENDATION: "RECOMMENDATION",          // "Meilleur hardware wallet?"
  INCIDENT_QUERY: "INCIDENT_QUERY",         // "Y a-t-il eu des hacks?"
  GENERAL_CRYPTO: "GENERAL_CRYPTO",         // "C'est quoi le staking?"
  GREETING: "GREETING",                     // "Bonjour"
  UNKNOWN: "UNKNOWN",
};

// Product name patterns (common crypto products)
const PRODUCT_PATTERNS = [
  // Hardware wallets
  "ledger", "trezor", "coldcard", "bitbox", "keepkey", "safepal", "ellipal",
  "keystone", "ngrave", "archos", "cobo", "secux", "jade", "passport",
  // Exchanges
  "binance", "coinbase", "kraken", "bitstamp", "gemini", "ftx", "kucoin",
  "bybit", "okx", "gate", "huobi", "bitfinex", "crypto\\.com",
  // DeFi
  "aave", "compound", "uniswap", "sushiswap", "curve", "yearn", "maker",
  "lido", "rocket pool", "convex", "balancer", "1inch", "dydx",
  // Software wallets
  "metamask", "phantom", "rainbow", "trust wallet", "exodus", "atomic",
  "electrum", "wasabi", "sparrow", "blue wallet", "muun", "phoenix",
];

// Comparison keywords
const COMPARE_KEYWORDS = [
  "vs", "versus", "contre", "ou", "compare", "comparer", "comparaison",
  "différence", "difference", "mieux", "better", "between", "entre",
];

// Score/evaluation keywords
const SCORE_KEYWORDS = [
  "score", "note", "rating", "évaluation", "evaluation", "sécurité",
  "security", "safe", "avis", "review", "fiable", "reliable", "sûr",
];

// Security advice keywords
const SECURITY_ADVICE_KEYWORDS = [
  "comment", "how to", "sécuriser", "secure", "protéger", "protect",
  "conseils", "advice", "tips", "guide", "recommandation", "best practice",
  "stocker", "store", "garder", "keep", "hodl",
];

// Recommendation keywords
const RECOMMENDATION_KEYWORDS = [
  "meilleur", "best", "top", "recommande", "recommend", "suggère",
  "suggest", "quel", "which", "choisir", "choose", "acheter", "buy",
];

// Norm/standard keywords
const NORM_KEYWORDS = [
  "norme", "norm", "standard", "critère", "criterion", "secure element",
  "bip", "eip", "aes", "sha", "ecdsa", "multisig", "2fa", "passphrase",
  "seed", "recovery", "backup", "audit", "certification", "iso",
];

// Incident/hack keywords
const INCIDENT_KEYWORDS = [
  "hack", "hacked", "piraté", "breach", "faille", "vulnerability",
  "incident", "attaque", "attack", "vol", "theft", "compromis",
  "scam", "arnaque", "exploit",
];

// Greeting keywords
const GREETING_KEYWORDS = [
  "bonjour", "hello", "hi", "salut", "hey", "coucou", "bonsoir",
  "good morning", "good evening",
];

// Category keywords for recommendations
const CATEGORY_MAP = {
  "hardware wallet": ["hardware", "wallet hardware", "cold wallet", "portefeuille matériel", "cold storage"],
  "exchange": ["exchange", "plateforme", "cex", "centralisé", "centralized"],
  "defi": ["defi", "décentralisé", "decentralized", "dex", "yield", "staking", "lending"],
  "software wallet": ["software", "hot wallet", "mobile wallet", "app", "application"],
};

/**
 * Detect user intent from message
 * @param {string} message - User message
 * @returns {Object} Intent detection result
 */
export function detectIntent(message) {
  if (!message || typeof message !== "string") {
    return { intent: INTENTS.UNKNOWN, confidence: 0, entities: {} };
  }

  const normalizedMessage = message.toLowerCase().trim();
  const entities = {};

  // Check for greeting first (short messages)
  if (normalizedMessage.length < 20) {
    for (const greeting of GREETING_KEYWORDS) {
      if (normalizedMessage.includes(greeting)) {
        return { intent: INTENTS.GREETING, confidence: 0.95, entities };
      }
    }
  }

  // Extract product mentions
  const mentionedProducts = extractProducts(normalizedMessage);
  if (mentionedProducts.length > 0) {
    entities.products = mentionedProducts;
  }

  // Check for comparison intent (multiple products or comparison keywords)
  if (mentionedProducts.length >= 2 || hasKeywords(normalizedMessage, COMPARE_KEYWORDS)) {
    if (mentionedProducts.length >= 2) {
      return {
        intent: INTENTS.PRODUCT_COMPARE,
        confidence: 0.95,
        entities,
      };
    }
  }

  // Check for product score query (single product + score keywords)
  if (mentionedProducts.length === 1 && hasKeywords(normalizedMessage, SCORE_KEYWORDS)) {
    return {
      intent: INTENTS.PRODUCT_SCORE,
      confidence: 0.9,
      entities,
    };
  }

  // Check for product query (product name mentioned)
  if (mentionedProducts.length === 1) {
    return {
      intent: INTENTS.PRODUCT_SCORE,
      confidence: 0.85,
      entities,
    };
  }

  // Check for incident query
  if (hasKeywords(normalizedMessage, INCIDENT_KEYWORDS)) {
    entities.incidentType = detectIncidentType(normalizedMessage);
    return {
      intent: INTENTS.INCIDENT_QUERY,
      confidence: 0.85,
      entities,
    };
  }

  // Check for recommendation request
  if (hasKeywords(normalizedMessage, RECOMMENDATION_KEYWORDS)) {
    entities.category = detectCategory(normalizedMessage);
    return {
      intent: INTENTS.RECOMMENDATION,
      confidence: 0.85,
      entities,
    };
  }

  // Check for security advice
  if (hasKeywords(normalizedMessage, SECURITY_ADVICE_KEYWORDS)) {
    entities.topic = detectSecurityTopic(normalizedMessage);
    return {
      intent: INTENTS.SECURITY_ADVICE,
      confidence: 0.8,
      entities,
    };
  }

  // Check for norm/standard question
  if (hasKeywords(normalizedMessage, NORM_KEYWORDS)) {
    entities.normKeywords = extractNormKeywords(normalizedMessage);
    return {
      intent: INTENTS.NORM_QUESTION,
      confidence: 0.8,
      entities,
    };
  }

  // Default to general crypto question
  return {
    intent: INTENTS.GENERAL_CRYPTO,
    confidence: 0.6,
    entities,
  };
}

/**
 * Extract product names from message
 */
function extractProducts(message) {
  const products = [];

  for (const pattern of PRODUCT_PATTERNS) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(message)) {
      // Normalize product name
      let productName = pattern.replace(/\\\./g, ".");

      // Handle special cases
      if (productName === "crypto\\.com") productName = "crypto.com";

      products.push(productName);
    }
  }

  // Also try to extract from patterns like "le X" or "the X"
  const productMentionRegex = /(?:le|la|the|du|de la)\s+([a-zA-Z0-9.\-]+)/gi;
  let match;
  while ((match = productMentionRegex.exec(message)) !== null) {
    const potentialProduct = match[1].toLowerCase();
    if (!products.includes(potentialProduct) && potentialProduct.length > 2) {
      // Check if it looks like a product name (capitalized or known)
      products.push(potentialProduct);
    }
  }

  return [...new Set(products)]; // Remove duplicates
}

/**
 * Check if message contains any of the keywords
 */
function hasKeywords(message, keywords) {
  return keywords.some((keyword) => message.includes(keyword.toLowerCase()));
}

/**
 * Detect product category from message
 */
function detectCategory(message) {
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => message.includes(kw))) {
      return category;
    }
  }
  return null;
}

/**
 * Detect security topic from message
 */
function detectSecurityTopic(message) {
  const topics = {
    storage: ["stocker", "store", "garder", "keep", "hodl"],
    backup: ["backup", "sauvegarde", "recovery", "récupération"],
    passphrase: ["passphrase", "mot de passe", "password", "seed"],
    multisig: ["multisig", "multi-signature", "multi signature"],
    "2fa": ["2fa", "authentification", "authentication", "otp"],
  };

  for (const [topic, keywords] of Object.entries(topics)) {
    if (keywords.some((kw) => message.includes(kw))) {
      return topic;
    }
  }
  return "general";
}

/**
 * Detect incident type from message
 */
function detectIncidentType(message) {
  if (message.includes("hack") || message.includes("piraté")) return "hack";
  if (message.includes("scam") || message.includes("arnaque")) return "scam";
  if (message.includes("exploit")) return "exploit";
  if (message.includes("vol") || message.includes("theft")) return "theft";
  return "general";
}

/**
 * Extract norm-related keywords from message
 */
function extractNormKeywords(message) {
  const keywords = [];

  // Check for specific norm codes (S01, A12, etc.)
  const normCodeRegex = /\b([SAFE]\d{1,3})\b/gi;
  let match;
  while ((match = normCodeRegex.exec(message)) !== null) {
    keywords.push(match[1].toUpperCase());
  }

  // Check for technical terms
  const technicalTerms = [
    "secure element", "aes", "sha", "ecdsa", "ed25519", "secp256k1",
    "bip39", "bip44", "bip84", "multisig", "2fa", "passphrase",
  ];

  for (const term of technicalTerms) {
    if (message.includes(term)) {
      keywords.push(term);
    }
  }

  return keywords;
}

/**
 * Determine if web search is needed based on intent
 */
export function needsWebSearch(intent, entities) {
  // Always need web search for incidents (to get latest info)
  if (intent === INTENTS.INCIDENT_QUERY) {
    return true;
  }

  // Need web search for general crypto questions not in our DB
  if (intent === INTENTS.GENERAL_CRYPTO) {
    return true;
  }

  // Don't need web search for product-specific queries (we have the data)
  if ([INTENTS.PRODUCT_SCORE, INTENTS.PRODUCT_COMPARE, INTENTS.RECOMMENDATION].includes(intent)) {
    return false;
  }

  return false;
}

export default {
  INTENTS,
  detectIntent,
  needsWebSearch,
};
