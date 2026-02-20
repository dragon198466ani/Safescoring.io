import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { supabase, isSupabaseConfigured } from "@/libs/supabase";
import { validateRequestOrigin } from "@/libs/security";
import { checkRateLimit, getRemainingMessages } from "@/libs/chat-rate-limit";
import { searchCrypto, searchSecurityIncidents, formatSearchResultsForAI } from "@/libs/chat-web-search";
import { formatProductScore, formatProductComparison } from "@/libs/chat-response-formatter";
import { sanitizeILIKE } from "@/libs/sql-sanitize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// =============================================================================
// PROTECTION ANTI-SURCHARGE
// =============================================================================

// 1. Limite globale de requêtes concurrentes
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 100; // Max 100 requêtes en parallèle

// 1b. File d'attente avec mutex et throttling intelligent
const requestQueue = [];
let isProcessing = false;
const MAX_REQUESTS_PER_SECOND = 3; // 3 req/s max (plus conservateur)
const BASE_INTERVAL_MS = 1000 / MAX_REQUESTS_PER_SECOND; // ~333ms
const JITTER_MS = 100; // Jitter aléatoire 0-100ms

async function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

// Ajoute jitter aléatoire pour éviter les pics
function getIntervalWithJitter() {
  return BASE_INTERVAL_MS + Math.floor(Math.random() * JITTER_MS);
}

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;

  while (requestQueue.length > 0) {
    const { fn, resolve, reject } = requestQueue.shift();
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    // Attendre avec jitter entre chaque requête
    if (requestQueue.length > 0) {
      await new Promise(r => setTimeout(r, getIntervalWithJitter()));
    }
  }

  isProcessing = false;
}

// 2. Circuit breaker par provider (désactive si trop d'erreurs)
const circuitBreaker = new Map(); // provider -> { failures: number, lastFailure: timestamp, open: boolean }
const CIRCUIT_BREAKER_THRESHOLD = 5; // 5 erreurs consécutives = ouverture
const CIRCUIT_BREAKER_RESET_MS = 30000; // Reset après 30s

// 3. Cache LRU intelligent pour réponses fréquentes (évite d'appeler l'IA)
const responseCache = new Map();
const CACHE_MAX_SIZE = 1000; // Plus de cache
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Patterns communs pour normalisation
const PRODUCT_ALIASES = {
  'ledger': 'ledger-nano-x', 'trezor': 'trezor-model-t', 'binance': 'binance',
  'kraken': 'kraken', 'coinbase': 'coinbase', 'metamask': 'metamask',
  'aave': 'aave', 'uniswap': 'uniswap', 'compound': 'compound',
};

function normalizeMessage(message) {
  // Normalisation avancée pour matching approximatif
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?!.,:;'"()]/g, '') // Ponctuation
    .replace(/\b(le|la|les|un|une|des|du|de|est|sont|quel|quelle|quels|quelles|comment|pourquoi)\b/g, '') // Stopwords FR
    .replace(/\b(the|a|an|is|are|what|which|how|why)\b/g, '') // Stopwords EN
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function getCacheKey(message) {
  return normalizeMessage(message);
}

// Matching approximatif: trouve une réponse cachée similaire
function findSimilarCachedResponse(message) {
  const normalized = normalizeMessage(message);

  // 1. Exact match
  const exact = responseCache.get(normalized);
  if (exact && Date.now() - exact.timestamp < CACHE_TTL_MS) {
    return { response: exact.response, matchType: 'exact' };
  }

  // 2. Fuzzy match: chercher des questions sur le même produit
  const words = normalized.split(' ').filter(w => w.length > 2);
  for (const [key, cached] of responseCache) {
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) continue;

    // Même produit mentionné + question similaire
    const keyWords = key.split(' ').filter(w => w.length > 2);
    const commonWords = words.filter(w => keyWords.includes(w));

    // >70% de mots en commun = probablement la même question
    if (commonWords.length >= Math.max(1, Math.floor(words.length * 0.7))) {
      return { response: cached.response, matchType: 'fuzzy' };
    }
  }

  return null;
}

function getCachedResponse(message) {
  const result = findSimilarCachedResponse(message);
  return result?.response || null;
}

function setCachedResponse(message, response) {
  const key = getCacheKey(message);
  // LRU: supprimer les plus anciens si cache plein
  if (responseCache.size >= CACHE_MAX_SIZE) {
    // Supprimer les 10% plus anciens
    const toDelete = Math.floor(CACHE_MAX_SIZE * 0.1);
    const keys = Array.from(responseCache.keys());
    for (let i = 0; i < toDelete; i++) {
      responseCache.delete(keys[i]);
    }
  }
  responseCache.set(key, { response, timestamp: Date.now() });
}

// 4. Vérifier si un provider est disponible (circuit breaker)
function isProviderAvailable(provider) {
  const state = circuitBreaker.get(provider);
  if (!state) return true;

  // Circuit ouvert mais timeout passé → half-open (réessayer)
  if (state.open && Date.now() - state.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
    state.open = false;
    state.failures = 0;
    return true;
  }

  return !state.open;
}

function recordProviderFailure(provider) {
  let state = circuitBreaker.get(provider);
  if (!state) {
    state = { failures: 0, lastFailure: 0, open: false };
    circuitBreaker.set(provider, state);
  }
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.open = true;
    console.warn(`[CircuitBreaker] ${provider} désactivé (${state.failures} erreurs)`);
  }
}

function recordProviderSuccess(provider) {
  const state = circuitBreaker.get(provider);
  if (state) {
    state.failures = 0;
    state.open = false;
  }
}

/**
 * CHATBOT AUTONOME SAFESCORING
 *
 * RÈGLE #1: Toujours montrer un score SAFE avec conseils
 * RÈGLE #2: Proposer d'ajouter aux setups
 * RÈGLE #3: Upsell vers rapport complet payant
 */

// Configuration des plans (aligné avec config.js)
// Free: Scores illimités, 1 setup
// Explorer ($19/mo): 5 setups, comparaisons, PDF, email support
// Professional ($39/mo): 20 setups, API, tracking, priority support
// Enterprise ($499/mo): Illimité, team, white-label
const PLAN_FEATURES = {
  free: {
    name: "Gratuit",
    price: 0,
    features: ["Scores illimités", "1 setup (3 produits max)", "Voir les faiblesses"],
    limitations: ["Pas de comparaisons avancées", "Pas de PDF export", "Pas d'API"],
  },
  explorer: {
    name: "Explorer",
    price: 19,
    priceLabel: "$19/mois",
    features: ["5 setups (5 produits chacun)", "Comparaisons illimitées", "Export PDF", "Email support"],
    upsellTriggers: ["comparison", "pdf_export", "multiple_setups"],
  },
  professional: {
    name: "Professional",
    price: 39,
    priceLabel: "$39/mois",
    features: ["20 setups (10 produits chacun)", "Accès API (1000 req/jour)", "Suivi des scores", "Support prioritaire"],
    upsellTriggers: ["api_access", "score_tracking", "advanced_analysis", "many_setups"],
  },
  enterprise: {
    name: "Enterprise",
    price: 499,
    priceLabel: "$499/mois",
    features: ["Tout illimité", "Onboarding dédié", "Support prioritaire (<4h)", "Évaluations custom (5/mo)", "Équipe + SSO (sur demande)", "Rapports compliance", "Canal Slack dédié"],
    upsellTriggers: ["team", "unlimited", "sla", "compliance", "custom_evaluation", "sso"],
  },
};

// =============================================================================
// AI PROVIDERS - Optimisé pour 50k+ utilisateurs avec rotation de clés
// =============================================================================

// Collecter toutes les clés GROQ (GROQ_API_KEY, GROQ_API_KEY_2, ..., GROQ_API_KEY_15)
function getGroqKeys() {
  const keys = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  for (let i = 2; i <= 20; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

// Collecter toutes les clés OpenRouter
function getOpenRouterKeys() {
  const keys = [];
  if (process.env.OPENROUTER_API_KEY) keys.push(process.env.OPENROUTER_API_KEY);
  for (let i = 2; i <= 5; i++) {
    const key = process.env[`OPENROUTER_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

// Collecter toutes les clés Cerebras
function getCerebrasKeys() {
  const keys = [];
  if (process.env.CEREBRAS_API_KEY) keys.push(process.env.CEREBRAS_API_KEY);
  for (let i = 2; i <= 5; i++) {
    const key = process.env[`CEREBRAS_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  return keys;
}

// Index pour rotation round-robin
let groqKeyIndex = 0;
let openRouterKeyIndex = 0;
let cerebrasKeyIndex = 0;

const AI_CONFIG = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    getKey: () => {
      const keys = getGroqKeys();
      if (!keys.length) return null;
      const key = keys[groqKeyIndex % keys.length];
      groqKeyIndex++;
      return key;
    },
    rps: 30, // par clé, donc 30 * 15 = 450 rps total!
    priority: 1,
  },
  groq_fast: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.1-8b-instant",
    getKey: () => {
      const keys = getGroqKeys();
      if (!keys.length) return null;
      const key = keys[groqKeyIndex % keys.length];
      groqKeyIndex++;
      return key;
    },
    rps: 60,
    priority: 2,
  },
  cerebras: {
    url: "https://api.cerebras.ai/v1/chat/completions",
    model: "llama-3.3-70b",
    getKey: () => {
      const keys = getCerebrasKeys();
      if (!keys.length) return null;
      const key = keys[cerebrasKeyIndex % keys.length];
      cerebrasKeyIndex++;
      return key;
    },
    rps: 60,
    priority: 1, // Très rapide!
  },
  // OpenRouter désactivé (402 - pas de crédits)
  // openrouter: {
  //   url: "https://openrouter.ai/api/v1/chat/completions",
  //   model: "meta-llama/llama-3.3-70b-instruct",
  //   getKey: () => {
  //     const keys = getOpenRouterKeys();
  //     if (!keys.length) return null;
  //     const key = keys[openRouterKeyIndex % keys.length];
  //     openRouterKeyIndex++;
  //     return key;
  //   },
  //   rps: 100,
  //   priority: 3,
  // },
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    getKey: () => process.env.DEEPSEEK_API_KEY,
    rps: 50,
    priority: 4,
  },
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-large-latest",
    getKey: () => process.env.MISTRAL_API_KEY,
    rps: 50,
    priority: 2, // Haute priorité car fiable
  },
};

// Rate limiting en mémoire
const usageCounters = new Map();

function getAvailableProvider(isSimpleQuery = false) {
  const now = Date.now();
  const windowMs = 1000;

  // Nettoyer vieux compteurs
  for (const [key, data] of usageCounters) {
    if (now - data.ts > windowMs) usageCounters.delete(key);
  }

  // Filtrer les providers disponibles (avec clé + circuit breaker fermé)
  const availableProviders = Object.entries(AI_CONFIG)
    .filter(([name, cfg]) => cfg.getKey() && isProviderAvailable(name))
    .sort((a, b) => a[1].priority - b[1].priority);

  if (availableProviders.length === 0) {
    // Tous les circuits sont ouverts - forcer un reset du premier provider
    const firstWithKey = Object.entries(AI_CONFIG).find(([_, cfg]) => cfg.getKey());
    if (firstWithKey) {
      console.warn("[CircuitBreaker] Tous les providers down, reset forcé de", firstWithKey[0]);
      circuitBreaker.delete(firstWithKey[0]);
      return firstWithKey[0];
    }
    return null;
  }

  // Questions simples → modèle rapide
  if (isSimpleQuery && AI_CONFIG.groq_fast.getKey()) {
    const usage = usageCounters.get('groq_fast');
    if (!usage || usage.count < AI_CONFIG.groq_fast.rps) {
      usageCounters.set('groq_fast', { count: (usage?.count || 0) + 1, ts: usage?.ts || now });
      return 'groq_fast';
    }
  }

  // Parcourir par priorité
  const available = Object.entries(AI_CONFIG)
    .filter(([_, c]) => c.getKey())
    .sort((a, b) => a[1].priority - b[1].priority);

  for (const [name, config] of available) {
    const usage = usageCounters.get(name);
    if (!usage || usage.count < config.rps) {
      usageCounters.set(name, { count: (usage?.count || 0) + 1, ts: usage?.ts || now });
      return name;
    }
  }

  // Fallback: premier provider (va queue côté API)
  return available[0]?.[0] || 'groq';
}

// Détecter si question simple (pas besoin du gros modèle)
function isSimpleQuestion(message) {
  const simplePatterns = [
    /^(bonjour|salut|hello|hi|hey)/i,
    /^(merci|thanks|ok|d'accord)/i,
    /qu.*(est|son).*score/i,  // "quel est le score de X"
    /^(oui|non|yes|no)$/i,
  ];
  return message.length < 100 && simplePatterns.some(p => p.test(message));
}

// =============================================================================
// TOOLS - Actions autonomes du chatbot
// =============================================================================

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Recherche produits crypto. Retourne TOUJOURS les scores SAFE.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Nom du produit" },
          type: { type: "string", description: "Type: HW_WALLET, SW_WALLET, CEX, DEX, LENDING, STAKING, BRIDGE" },
          min_score: { type: "number", description: "Score minimum 0-100" },
          limit: { type: "number", description: "Max résultats (défaut: 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_score",
      description: "Score SAFE détaillé d'un produit avec analyse par pilier",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Slug du produit (ex: ledger-nano-x)" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_products",
      description: "Compare 2-4 produits sur leurs scores SAFE",
      parameters: {
        type: "object",
        properties: {
          slugs: { type: "array", items: { type: "string" }, description: "Slugs des produits" },
        },
        required: ["slugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_best_by_type",
      description: "Top produits par type selon score SAFE",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "Type de produit" },
          limit: { type: "number", description: "Nombre (défaut: 5)" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_setup",
      description: "Analyse le setup crypto de l'utilisateur et donne un score global",
      parameters: {
        type: "object",
        properties: {
          product_slugs: { type: "array", items: { type: "string" }, description: "Produits du setup" },
        },
        required: ["product_slugs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_to_setup",
      description: "Propose d'ajouter un produit au setup de l'utilisateur",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Slug du produit à ajouter" },
          reason: { type: "string", description: "Raison de la recommandation" },
        },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "offer_paid_report",
      description: "Propose un abonnement payant selon le besoin: Explorer ($19/mo) pour comparaisons/PDF, Professional ($39/mo) pour API/tracking, Enterprise ($499/mo) pour équipes/illimité.",
      parameters: {
        type: "object",
        properties: {
          product_slug: { type: "string", description: "Produit concerné (optionnel)" },
          report_type: { type: "string", enum: ["detailed", "premium"], description: "Type: detailed=Explorer, premium=Professional (legacy)" },
          trigger_reason: {
            type: "string",
            enum: [
              "comparison", "pdf_export", "multiple_setups",  // -> Explorer
              "api_access", "score_tracking", "advanced_analysis", "many_setups",  // -> Professional
              "team", "unlimited", "white_label"  // -> Enterprise
            ],
            description: "Raison de l'upsell: comparison/pdf_export/multiple_setups → Explorer, api_access/score_tracking/advanced_analysis/many_setups → Professional, team/unlimited/white_label → Enterprise"
          },
        },
        required: ["trigger_reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_compatibility",
      description: "Vérifie compatibilité entre 2 produits",
      parameters: {
        type: "object",
        properties: {
          slug_a: { type: "string" },
          slug_b: { type: "string" },
        },
        required: ["slug_a", "slug_b"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Recherche web si info non disponible dans Supabase",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Requête de recherche" },
        },
        required: ["query"],
      },
    },
  },
  // ============= NOUVEAUX TOOLS SPÉCIFIQUES SAFESCORING =============
  {
    type: "function",
    function: {
      name: "explain_norm",
      description: "Explique une norme de sécurité (BIP, EIP, ISO, etc.) et pourquoi elle est importante pour la sécurité crypto",
      parameters: {
        type: "object",
        properties: {
          norm_code: { type: "string", description: "Code de la norme (ex: BIP-39, EIP-712, S-01)" },
        },
        required: ["norm_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_security_incidents",
      description: "Récupère les hacks, exploits et incidents de sécurité récents pour un produit ou en général",
      parameters: {
        type: "object",
        properties: {
          product_slug: { type: "string", description: "Slug du produit (optionnel)" },
          limit: { type: "number", description: "Nombre max (défaut: 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_alternatives",
      description: "Suggère des alternatives plus sécurisées à un produit donné",
      parameters: {
        type: "object",
        properties: {
          product_slug: { type: "string", description: "Slug du produit à remplacer" },
          min_score_improvement: { type: "number", description: "Amélioration minimum du score" },
        },
        required: ["product_slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_security_tips",
      description: "Donne des conseils de sécurité personnalisés selon le profil utilisateur",
      parameters: {
        type: "object",
        properties: {
          context: { type: "string", enum: ["beginner", "intermediate", "expert"], description: "Niveau utilisateur" },
          product_type: { type: "string", description: "Type de produit concerné" },
          focus: { type: "string", enum: ["storage", "trading", "defi", "general"], description: "Focus du conseil" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explain_product_type",
      description: "Explique ce qu'est un type de produit (CEX, DEX, hardware wallet, etc.) et ses risques spécifiques",
      parameters: {
        type: "object",
        properties: {
          type_code: { type: "string", description: "Code: HW_WALLET, SW_WALLET, CEX, DEX, LENDING, STAKING, BRIDGE" },
        },
        required: ["type_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_country_regulations",
      description: "Donne les informations sur la réglementation crypto d'un pays",
      parameters: {
        type: "object",
        properties: {
          country_code: { type: "string", description: "Code ISO du pays (FR, US, CH, DE, etc.)" },
        },
        required: ["country_code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_risk_exposure",
      description: "Calcule l'exposition au risque basée sur le montant et les produits utilisés",
      parameters: {
        type: "object",
        properties: {
          amount_eur: { type: "number", description: "Montant en EUR" },
          product_slugs: { type: "array", items: { type: "string" }, description: "Produits utilisés" },
        },
        required: ["amount_eur"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_optimal_setup",
      description: "Suggère un setup optimal selon le budget et le profil de risque",
      parameters: {
        type: "object",
        properties: {
          budget_eur: { type: "number", description: "Budget disponible en EUR" },
          risk_profile: { type: "string", enum: ["conservative", "moderate", "aggressive"], description: "Profil de risque" },
          use_case: { type: "string", enum: ["hodl", "trading", "defi", "mixed"], description: "Cas d'usage principal" },
        },
        required: ["risk_profile"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pillar_deep_analysis",
      description: "Analyse approfondie d'un pilier SAFE spécifique (S, A, F ou E) pour un produit",
      parameters: {
        type: "object",
        properties: {
          product_slug: { type: "string", description: "Slug du produit" },
          pillar: { type: "string", enum: ["S", "A", "F", "E"], description: "Pilier à analyser en détail" },
        },
        required: ["product_slug", "pillar"],
      },
    },
  },
  // ============= SETUP MANAGEMENT TOOL (REALTIME) =============
  {
    type: "function",
    function: {
      name: "manage_user_setup",
      description: "Gère les setups de l'utilisateur en temps réel. Peut créer un nouveau setup, ajouter/retirer des produits. Le dashboard se met à jour automatiquement.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "add_product", "remove_product", "rename"],
            description: "Action: create (nouveau setup), add_product, remove_product, rename"
          },
          setup_id: { type: "string", description: "ID du setup (requis pour add/remove/rename)" },
          setup_name: { type: "string", description: "Nom du setup (pour create ou rename)" },
          product_slug: { type: "string", description: "Slug du produit (pour add/remove)" },
          product_role: { type: "string", enum: ["wallet", "exchange", "defi", "other"], description: "Rôle du produit dans le setup" },
          description: { type: "string", description: "Description du setup (optionnel)" },
        },
        required: ["action"],
      },
    },
  },
  // ============= NAVIGATION TOOL =============
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Propose à l'utilisateur de naviguer vers une page du site SafeScoring. Utilise ce tool quand l'utilisateur veut voir une page, explorer le catalogue, accéder à son dashboard, etc.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["products", "leaderboard", "compare", "methodology", "dashboard", "setups", "incidents", "map", "blog", "about", "pricing", "product_detail", "compare_products"],
            description: "Page de destination"
          },
          product_slug: { type: "string", description: "Slug du produit (pour product_detail)" },
          product_slugs: { type: "array", items: { type: "string" }, description: "Slugs des produits (pour compare_products)" },
          context: { type: "string", description: "Contexte ou raison de la navigation" },
        },
        required: ["page"],
      },
    },
  },
];

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

async function searchProducts({ query, type, min_score, limit = 5 }) {
  // SECURITY: Sanitize query to prevent ILIKE injection (escape %, _, \)
  const sanitizedQuery = query ? sanitizeILIKE(query, 100) : null;

  let q = supabase
    .from("products")
    .select(`
      id, name, slug, url,
      product_types(code, name, category),
      safe_scoring_results(note_finale, score_s, score_a, score_f, score_e)
    `)
    .not("safe_scoring_results", "is", null)
    .order("safe_scoring_results(note_finale)", { ascending: false })
    .limit(limit);

  if (sanitizedQuery) q = q.ilike("name", `%${sanitizedQuery}%`);
  if (type) q = q.eq("product_types.code", type);
  if (min_score) q = q.gte("safe_scoring_results.note_finale", min_score);

  const { data, error } = await q;
  if (error) return { error: error.message };

  return {
    products: (data || []).map(p => ({
      name: p.name,
      slug: p.slug,
      type: p.product_types?.name,
      type_code: p.product_types?.code,
      score_safe: p.safe_scoring_results?.[0]?.note_finale || 0,
      scores: {
        S: p.safe_scoring_results?.[0]?.score_s || 0,
        A: p.safe_scoring_results?.[0]?.score_a || 0,
        F: p.safe_scoring_results?.[0]?.score_f || 0,
        E: p.safe_scoring_results?.[0]?.score_e || 0,
      },
      url: p.url,
    })),
    _action: "SHOW_PRODUCTS", // UI hint
  };
}

async function getProductScore({ slug }) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, slug, url, price_eur,
      product_types(code, name, category, is_hardware),
      safe_scoring_results(
        note_finale, score_s, score_a, score_f, score_e,
        consumer_score, essential_score,
        total_norms_evaluated, total_yes, total_no
      ),
      evaluations(result, norms(code, title, pillar, is_essential, description))
    `)
    .eq("slug", slug)
    .single();

  if (error || !data) return { error: `Produit "${slug}" non trouvé` };

  const scores = data.safe_scoring_results?.[0];
  const evals = data.evaluations || [];

  // Group evaluations by pillar
  const pillarEvals = { S: [], A: [], F: [], E: [] };
  evals.forEach(e => {
    if (e.norms?.pillar && pillarEvals[e.norms.pillar]) {
      pillarEvals[e.norms.pillar].push(e);
    }
  });

  // Build rich pillar data with FREE insights
  const buildPillarData = (pillar, score, name, emoji, desc) => {
    const pEvals = pillarEvals[pillar];
    const passed = pEvals.filter(e => e.result === "YES" || e.result === "YESP");
    const failed = pEvals.filter(e => e.result === "NO");
    const essentialFailed = failed.filter(e => e.norms?.is_essential);

    // FREE: Give 1 key insight per pillar (the most important)
    const keyStrength = passed.find(e => e.norms?.is_essential)?.norms;
    const keyWeakness = essentialFailed[0]?.norms;

    // Determine pillar status
    let status, statusColor;
    if (score >= 80) { status = "Excellent"; statusColor = "green"; }
    else if (score >= 60) { status = "Bon"; statusColor = "amber"; }
    else if (score >= 40) { status = "Moyen"; statusColor = "orange"; }
    else { status = "Critique"; statusColor = "red"; }

    return {
      value: score,
      name,
      emoji,
      desc,
      status,
      statusColor,
      // FREE: Stats showing depth of analysis
      stats: {
        total: pEvals.length,
        passed: passed.length,
        failed: failed.length,
        essential_failed: essentialFailed.length,
      },
      // FREE: 1 key insight to demonstrate value
      freeInsight: keyWeakness
        ? { type: "warning", code: keyWeakness.code, text: keyWeakness.title }
        : keyStrength
        ? { type: "success", code: keyStrength.code, text: keyStrength.title }
        : null,
      // TEASER: Show what's locked
      lockedInsights: Math.max(0, failed.length - 1),
      hasEssentialIssues: essentialFailed.length > 0,
    };
  };

  const pillarData = {
    S: buildPillarData("S", scores?.score_s || 0, "Security", "🔐", "Cryptographie, gestion des clés, résistance aux attaques"),
    A: buildPillarData("A", scores?.score_a || 0, "Adversity", "🛡️", "Backup, recovery, résilience aux pannes"),
    F: buildPillarData("F", scores?.score_f || 0, "Fidelity", "⚡", "UX, multi-chain, intégrations, flexibilité"),
    E: buildPillarData("E", scores?.score_e || 0, "Ecosystem", "🌐", "Communauté, audits, développement actif"),
  };

  // Critical failures (essential norms failed) - show only count in free
  const criticalFailures = evals
    .filter(e => e.norms?.is_essential && e.result === "NO")
    .map(e => ({ code: e.norms.code, title: e.norms.title, pillar: e.norms.pillar }));

  // Calculate what's unlocked vs locked
  const totalIssues = evals.filter(e => e.result === "NO").length;
  const freeIssuesShown = Object.values(pillarData).filter(p => p.freeInsight?.type === "warning").length;
  const lockedIssues = totalIssues - freeIssuesShown;

  // Determine upsell urgency
  let upsellUrgency = null;
  let upsellReason = null;
  if (criticalFailures.length >= 3) {
    upsellUrgency = "critical";
    upsellReason = `${criticalFailures.length} failles critiques détectées`;
  } else if (criticalFailures.length > 0) {
    upsellUrgency = "high";
    upsellReason = `${criticalFailures.length} point(s) critique(s) à analyser`;
  } else if (lockedIssues > 5) {
    upsellUrgency = "medium";
    upsellReason = `${lockedIssues} points d'amélioration identifiés`;
  }

  // Calcul de la fraîcheur des données
  const lastUpdated = scores?.updated_at || data.updated_at;
  const daysSinceUpdate = lastUpdated
    ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const dataFreshness = daysSinceUpdate === null ? "unknown"
    : daysSinceUpdate < 7 ? "fresh"
    : daysSinceUpdate < 30 ? "recent"
    : "stale";

  return {
    name: data.name,
    slug: data.slug,
    type: data.product_types?.name,
    type_code: data.product_types?.code,
    is_hardware: data.product_types?.is_hardware,
    price_eur: data.price_eur,
    score_safe: scores?.note_finale || 0,
    // Rich pillar data showcasing SAFE methodology
    pillars: pillarData,
    // Legacy format for compatibility
    scores: {
      S: pillarData.S.value,
      A: pillarData.A.value,
      F: pillarData.F.value,
      E: pillarData.E.value,
    },
    stats: {
      norms_checked: scores?.total_norms_evaluated || 0,
      passed: scores?.total_yes || 0,
      failed: scores?.total_no || 0,
    },
    // FREE: Show critical count (not details)
    critical_count: criticalFailures.length,
    critical_failures: criticalFailures.slice(0, 2), // Only show 2 in free
    // TEASER section
    teaser: {
      locked_issues: lockedIssues,
      locked_details: criticalFailures.length > 2 ? criticalFailures.length - 2 : 0,
      upsell_urgency: upsellUrgency,
      upsell_reason: upsellReason,
      premium_features: [
        `Analyse détaillée des ${totalIssues} points vérifiés`,
        "Plan d'action personnalisé",
        "Comparaison avec les alternatives",
        "Recommandations d'experts",
      ],
    },
    // MÉTADONNÉES DE CONFIANCE (pour réponses factuelles)
    _confidence: {
      data_source: "supabase_verified",
      last_updated: lastUpdated,
      days_since_update: daysSinceUpdate,
      freshness: dataFreshness,
      norms_evaluated: scores?.total_norms_evaluated || 0,
      verification_level: scores?.total_norms_evaluated >= 50 ? "comprehensive" : scores?.total_norms_evaluated >= 20 ? "standard" : "basic",
    },
    _citation: `SafeScoring DB | ${scores?.total_norms_evaluated || 0} critères | ${dataFreshness === "fresh" ? "Données à jour" : dataFreshness === "recent" ? "Màj < 30j" : "Données anciennes (>30j)"}`,
    _action: "SHOW_SCORE_CARD",
    _upsell: upsellUrgency ? "detailed" : null,
  };
}

async function compareProducts({ slugs }) {
  const results = await Promise.all(slugs.map(slug => getProductScore({ slug })));
  const valid = results.filter(r => !r.error);

  if (valid.length < 2) return { error: "Minimum 2 produits valides requis" };

  const winner = valid.reduce((best, p) =>
    p.score_safe > (best?.score_safe || 0) ? p : best, null);

  return {
    products: valid,
    winner: winner?.name,
    comparison: {
      best_security: valid.reduce((b, p) => p.scores.S.value > (b?.scores?.S?.value || 0) ? p : b, null)?.name,
      best_adversity: valid.reduce((b, p) => p.scores.A.value > (b?.scores?.A?.value || 0) ? p : b, null)?.name,
      best_fidelity: valid.reduce((b, p) => p.scores.F.value > (b?.scores?.F?.value || 0) ? p : b, null)?.name,
      best_ecosystem: valid.reduce((b, p) => p.scores.E.value > (b?.scores?.E?.value || 0) ? p : b, null)?.name,
    },
    _action: "SHOW_COMPARISON",
    _upsell: "detailed", // Always offer detailed comparison report
  };
}

async function getBestByType({ type, limit = 5 }) {
  const { data } = await supabase
    .from("products")
    .select(`
      name, slug,
      product_types!inner(code, name),
      safe_scoring_results(note_finale, score_s, score_a, score_f, score_e)
    `)
    .eq("product_types.code", type)
    .not("safe_scoring_results", "is", null)
    .order("safe_scoring_results(note_finale)", { ascending: false })
    .limit(limit);

  return {
    type,
    type_name: data?.[0]?.product_types?.name || type,
    ranking: (data || []).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      slug: p.slug,
      score_safe: p.safe_scoring_results?.[0]?.note_finale || 0,
      scores: {
        S: p.safe_scoring_results?.[0]?.score_s || 0,
        A: p.safe_scoring_results?.[0]?.score_a || 0,
        F: p.safe_scoring_results?.[0]?.score_f || 0,
        E: p.safe_scoring_results?.[0]?.score_e || 0,
      },
    })),
    _action: "SHOW_RANKING",
    _cta: "ADD_TO_SETUP", // Suggest adding top one to setup
  };
}

async function analyzeSetup({ product_slugs }, userId) {
  const products = await Promise.all(product_slugs.map(slug => getProductScore({ slug })));
  const valid = products.filter(p => !p.error);

  if (valid.length === 0) return { error: "Aucun produit valide" };

  const avgScore = Math.round(valid.reduce((s, p) => s + p.score_safe, 0) / valid.length);
  const avgPillars = {
    S: Math.round(valid.reduce((s, p) => s + p.scores.S.value, 0) / valid.length),
    A: Math.round(valid.reduce((s, p) => s + p.scores.A.value, 0) / valid.length),
    F: Math.round(valid.reduce((s, p) => s + p.scores.F.value, 0) / valid.length),
    E: Math.round(valid.reduce((s, p) => s + p.scores.E.value, 0) / valid.length),
  };

  const weakest = valid.reduce((w, p) => p.score_safe < (w?.score_safe || 100) ? p : w, null);
  const weakestPillar = Object.entries(avgPillars).reduce((w, [k, v]) => v < w.v ? { k, v } : w, { k: "S", v: 100 });

  // Recommendations
  const recommendations = [];
  const hasHW = valid.some(p => p.is_hardware);
  if (!hasHW) recommendations.push({ priority: "HIGH", text: "Ajoutez un hardware wallet pour sécuriser vos clés offline" });
  if (weakest?.score_safe < 50) recommendations.push({ priority: "HIGH", text: `Remplacez ${weakest.name} (score ${weakest.score_safe}) par une alternative plus sûre` });
  if (weakestPillar.v < 60) {
    const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };
    recommendations.push({ priority: "MEDIUM", text: `Renforcez votre ${pillarNames[weakestPillar.k]} (score: ${weakestPillar.v})` });
  }

  return {
    setup_score: avgScore,
    products: valid.map(p => ({ name: p.name, slug: p.slug, score: p.score_safe })),
    pillar_scores: avgPillars,
    weakest_product: weakest ? { name: weakest.name, score: weakest.score_safe } : null,
    weakest_pillar: { pillar: weakestPillar.k, score: weakestPillar.v },
    recommendations,
    _action: "SHOW_SETUP_ANALYSIS",
    _upsell: "premium", // Offer full audit
    _cta: recommendations.length > 0 ? "IMPROVE_SETUP" : "SETUP_OK",
  };
}

async function addToSetup({ slug, reason }, userId) {
  // Get product info
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, safe_scoring_results(note_finale)")
    .eq("slug", slug)
    .single();

  if (!product) return { error: "Produit non trouvé" };

  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      score: product.safe_scoring_results?.[0]?.note_finale || 0,
    },
    reason: reason || "Recommandé par l'assistant SAFE",
    _action: "PROMPT_ADD_TO_SETUP", // UI will show "Add to my setup" button
    _message: `Voulez-vous ajouter ${product.name} à votre setup ?`,
  };
}

// ============= REALTIME SETUP MANAGEMENT =============
async function manageUserSetup({ action, setup_id, setup_name, product_slug, product_role, description }, userId) {
  if (!userId) {
    return {
      error: "Vous devez être connecté pour gérer vos setups",
      _action: "REQUIRE_LOGIN"
    };
  }

  try {
    switch (action) {
      // =========== CREATE NEW SETUP ===========
      case "create": {
        if (!setup_name) {
          return { error: "Nom du setup requis pour créer un nouveau setup" };
        }

        // Check setup limit based on user's plan
        const { data: existingSetups } = await supabase
          .from("user_setups")
          .select("id")
          .eq("user_id", userId);

        const { data: user } = await supabase
          .from("users")
          .select("plan_type")
          .eq("id", userId)
          .single();

        const planLimits = { free: 1, explorer: 5, professional: 20, enterprise: -1 };
        const userPlan = user?.plan_type?.toLowerCase() || "free";
        const limit = planLimits[userPlan] || 1;

        if (limit !== -1 && (existingSetups?.length || 0) >= limit) {
          return {
            error: `Limite atteinte (${limit} setups). Passez à un plan supérieur pour plus de setups.`,
            _action: "UPSELL_SETUPS",
            current_count: existingSetups?.length || 0,
            limit,
          };
        }

        // Create the setup
        const { data: newSetup, error: createError } = await supabase
          .from("user_setups")
          .insert({
            user_id: userId,
            name: setup_name,
            description: description || `Setup créé par SafeBot`,
            products: [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;

        return {
          success: true,
          setup: newSetup,
          _action: "SETUP_CREATED",
          _realtime: true, // Dashboard will update via Supabase Realtime
          _message: `✅ Setup "${setup_name}" créé ! Votre dashboard se met à jour automatiquement.`,
        };
      }

      // =========== ADD PRODUCT TO SETUP ===========
      case "add_product": {
        if (!setup_id || !product_slug) {
          // If no setup_id, get user's first setup
          if (!setup_id) {
            const { data: userSetups } = await supabase
              .from("user_setups")
              .select("id, name")
              .eq("user_id", userId)
              .limit(1);

            if (!userSetups?.length) {
              return {
                error: "Aucun setup trouvé. Créez d'abord un setup.",
                _action: "SUGGEST_CREATE_SETUP"
              };
            }
            setup_id = userSetups[0].id;
          }
          if (!product_slug) {
            return { error: "Slug du produit requis" };
          }
        }

        // Get product info
        const { data: product } = await supabase
          .from("products")
          .select("id, name, slug, safe_scoring_results(note_finale, score_s, score_a, score_f, score_e)")
          .eq("slug", product_slug)
          .single();

        if (!product) return { error: `Produit "${product_slug}" non trouvé` };

        // Get current setup
        const { data: setup } = await supabase
          .from("user_setups")
          .select("id, name, products")
          .eq("id", setup_id)
          .eq("user_id", userId)
          .single();

        if (!setup) return { error: "Setup non trouvé ou non autorisé" };

        // Check if product already in setup
        const currentProducts = setup.products || [];
        if (currentProducts.some(p => p.product_id === product.id)) {
          return {
            error: `${product.name} est déjà dans ce setup`,
            setup_name: setup.name
          };
        }

        // Add product
        const updatedProducts = [
          ...currentProducts,
          {
            product_id: product.id,
            slug: product.slug,
            name: product.name,
            role: product_role || "other",
            added_at: new Date().toISOString(),
          }
        ];

        const { error: updateError } = await supabase
          .from("user_setups")
          .update({
            products: updatedProducts,
            updated_at: new Date().toISOString()
          })
          .eq("id", setup_id);

        if (updateError) throw updateError;

        const score = product.safe_scoring_results?.[0];
        return {
          success: true,
          product: {
            name: product.name,
            slug: product.slug,
            score: score?.note_finale || 0,
            scores: { S: score?.score_s, A: score?.score_a, F: score?.score_f, E: score?.score_e }
          },
          setup_name: setup.name,
          products_count: updatedProducts.length,
          _action: "PRODUCT_ADDED",
          _realtime: true,
          _message: `✅ ${product.name} ajouté à "${setup.name}" ! Score SAFE: ${score?.note_finale || "N/A"}/100`,
        };
      }

      // =========== REMOVE PRODUCT FROM SETUP ===========
      case "remove_product": {
        if (!setup_id || !product_slug) {
          return { error: "setup_id et product_slug requis" };
        }

        // Get current setup
        const { data: setup } = await supabase
          .from("user_setups")
          .select("id, name, products")
          .eq("id", setup_id)
          .eq("user_id", userId)
          .single();

        if (!setup) return { error: "Setup non trouvé ou non autorisé" };

        const currentProducts = setup.products || [];
        const productToRemove = currentProducts.find(p => p.slug === product_slug);

        if (!productToRemove) {
          return { error: `Produit "${product_slug}" non trouvé dans ce setup` };
        }

        const updatedProducts = currentProducts.filter(p => p.slug !== product_slug);

        const { error: updateError } = await supabase
          .from("user_setups")
          .update({
            products: updatedProducts,
            updated_at: new Date().toISOString()
          })
          .eq("id", setup_id);

        if (updateError) throw updateError;

        return {
          success: true,
          removed_product: productToRemove.name,
          setup_name: setup.name,
          products_count: updatedProducts.length,
          _action: "PRODUCT_REMOVED",
          _realtime: true,
          _message: `✅ ${productToRemove.name} retiré de "${setup.name}".`,
        };
      }

      // =========== RENAME SETUP ===========
      case "rename": {
        if (!setup_id || !setup_name) {
          return { error: "setup_id et setup_name requis" };
        }

        const { data: setup, error: updateError } = await supabase
          .from("user_setups")
          .update({
            name: setup_name,
            updated_at: new Date().toISOString()
          })
          .eq("id", setup_id)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) throw updateError;

        return {
          success: true,
          setup,
          _action: "SETUP_RENAMED",
          _realtime: true,
          _message: `✅ Setup renommé en "${setup_name}".`,
        };
      }

      default:
        return { error: `Action inconnue: ${action}` };
    }
  } catch (error) {
    console.error("[manageUserSetup] Error:", error);
    return { error: `Erreur: ${error.message}` };
  }
}

async function offerPaidReport({ product_slug, report_type, trigger_reason }) {
  // Map triggers to plan recommendations
  // Explorer: comparison, pdf_export, multiple_setups
  // Professional: api_access, score_tracking, advanced_analysis, many_setups
  // Enterprise: team, unlimited, white_label
  let recommendedPlan;
  let planCode;
  let reason;

  // Enterprise triggers
  if (trigger_reason === "team" || trigger_reason === "unlimited" || trigger_reason === "white_label") {
    recommendedPlan = PLAN_FEATURES.enterprise;
    planCode = "enterprise";
    reason = trigger_reason === "team"
      ? "Pour partager avec votre équipe"
      : trigger_reason === "white_label"
      ? "Pour des rapports personnalisés à votre marque"
      : "Pour un accès illimité sans restrictions";
  }
  // Professional triggers
  else if (trigger_reason === "api_access" || trigger_reason === "score_tracking" ||
           trigger_reason === "advanced_analysis" || trigger_reason === "many_setups" ||
           report_type === "premium") {
    recommendedPlan = PLAN_FEATURES.professional;
    planCode = "professional";
    reason = trigger_reason === "api_access"
      ? "Pour accéder à l'API SafeScoring (1000 req/jour)"
      : trigger_reason === "score_tracking"
      ? "Pour suivre l'évolution des scores dans le temps"
      : trigger_reason === "many_setups"
      ? "Pour gérer jusqu'à 20 setups différents"
      : "Pour une analyse approfondie avec toutes les normes";
  }
  // Explorer triggers (default)
  else if (trigger_reason === "comparison" || trigger_reason === "pdf_export" ||
           trigger_reason === "multiple_setups" || report_type === "detailed") {
    recommendedPlan = PLAN_FEATURES.explorer;
    planCode = "explorer";
    reason = trigger_reason === "comparison"
      ? "Pour comparer les produits en détail"
      : trigger_reason === "pdf_export"
      ? "Pour exporter vos analyses en PDF"
      : trigger_reason === "multiple_setups"
      ? "Pour créer jusqu'à 5 setups différents"
      : "Pour débloquer les comparaisons et exports";
  }
  // Fallback to Explorer
  else {
    recommendedPlan = PLAN_FEATURES.explorer;
    planCode = "explorer";
    reason = "Pour débloquer plus de fonctionnalités";
  }

  let productInfo = null;
  if (product_slug) {
    const { data } = await supabase
      .from("products")
      .select("name, slug")
      .eq("slug", product_slug)
      .single();
    productInfo = data;
  }

  // Enterprise doesn't have trial
  const hasTrial = planCode !== "enterprise";

  return {
    plan_code: planCode,
    plan_name: recommendedPlan.name,
    price: recommendedPlan.price,
    price_label: recommendedPlan.priceLabel,
    features: recommendedPlan.features,
    product: productInfo,
    reason,
    trial_available: hasTrial,
    trial_days: hasTrial ? 14 : 0,
    _action: "SHOW_UPSELL",
    _checkout_url: `/pricing`,
    _message: hasTrial
      ? `${reason}. ${recommendedPlan.priceLabel} avec 14 jours d'essai gratuit.`
      : `${reason}. ${recommendedPlan.priceLabel} - Contactez-nous pour une démo.`,
  };
}

async function checkCompatibility({ slug_a, slug_b }) {
  const [pA, pB] = await Promise.all([
    supabase.from("products").select("id, name, slug").eq("slug", slug_a).single(),
    supabase.from("products").select("id, name, slug").eq("slug", slug_b).single(),
  ]);

  if (pA.error || pB.error) return { error: "Produit(s) non trouvé(s)" };

  const { data: compat } = await supabase
    .from("product_compatibility")
    .select("*")
    .or(`and(product_a_id.eq.${pA.data.id},product_b_id.eq.${pB.data.id}),and(product_a_id.eq.${pB.data.id},product_b_id.eq.${pA.data.id})`)
    .single();

  return {
    product_a: pA.data.name,
    product_b: pB.data.name,
    compatible: compat?.type_compatible ?? compat?.ai_compatible ?? null,
    confidence: compat?.ai_confidence,
    steps: compat?.ai_steps,
    limitations: compat?.ai_limitations,
    _action: compat ? "SHOW_COMPATIBILITY" : "UNKNOWN_COMPATIBILITY",
  };
}

async function webSearch({ query }) {
  // Use Tavily API for web search
  try {
    const searchResult = await searchCrypto(query);

    if (searchResult.error) {
      return {
        note: "Recherche web temporairement indisponible. Utilisation des données Supabase vérifiées.",
        query,
        _action: "WEB_SEARCH_ERROR",
      };
    }

    const formattedResults = formatSearchResultsForAI(searchResult);

    return {
      query,
      answer: searchResult.answer,
      sources: searchResult.results.slice(0, 5).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.substring(0, 200),
      })),
      summary: formattedResults,
      _action: "WEB_SEARCH_SUCCESS",
      _note: "Sources web - vérifiez avec les données SAFE officielles",
    };
  } catch (error) {
    console.error("Web search error:", error);
    return {
      note: "Recherche web échouée. Données Supabase prioritaires.",
      query,
      _action: "WEB_SEARCH_ERROR",
    };
  }
}

// =============================================================================
// NOUVEAUX TOOLS SAFESCORING - IMPLEMENTATIONS
// =============================================================================

async function explainNorm({ norm_code }) {
  // SECURITY: Sanitize norm_code to prevent ILIKE injection (escape %, _, \)
  const sanitizedCode = norm_code ? sanitizeILIKE(norm_code, 100) : null;

  const { data: norm } = await supabase
    .from("norms")
    .select("code, title, description, pillar, is_essential, standard_reference, issuing_authority, crypto_relevance")
    .ilike("code", sanitizedCode ? `%${sanitizedCode}%` : "%")
    .single();

  if (!norm) {
    // Définitions statiques pour les normes courantes
    const commonNorms = {
      "BIP-39": { title: "Mnemonic Code (Seed Phrase)", pillar: "S", desc: "Standard pour la génération de phrases de récupération de 12/24 mots. Permet de restaurer un wallet depuis n'importe quel appareil compatible.", importance: "CRITIQUE - Sans seed phrase, perte totale des fonds en cas de problème" },
      "BIP-32": { title: "Hierarchical Deterministic Wallets", pillar: "S", desc: "Permet de dériver plusieurs clés depuis une seule seed. Base de tous les wallets modernes.", importance: "Essentiel pour la gestion multi-comptes sécurisée" },
      "BIP-44": { title: "Multi-Account Hierarchy", pillar: "F", desc: "Standard de dérivation multi-coins. Permet d'utiliser la même seed pour Bitcoin, Ethereum, etc.", importance: "Standard universel de compatibilité" },
      "EIP-712": { title: "Typed Structured Data Signing", pillar: "S", desc: "Permet de signer des données lisibles plutôt que des hashes incompréhensibles. Protège contre le phishing.", importance: "Protection contre les signatures malveillantes" },
      "EIP-1559": { title: "Fee Market Change", pillar: "F", desc: "Nouveau modèle de frais Ethereum avec base fee + tip. Rend les frais plus prévisibles.", importance: "Améliore l'UX des transactions" },
    };

    const match = commonNorms[norm_code.toUpperCase()];
    if (match) {
      return {
        code: norm_code,
        title: match.title,
        pillar: match.pillar,
        description: match.desc,
        importance: match.importance,
        _action: "SHOW_NORM_EXPLANATION",
      };
    }

    return { error: `Norme "${norm_code}" non trouvée. Essayez: BIP-39, BIP-32, EIP-712, etc.` };
  }

  return {
    code: norm.code,
    title: norm.title,
    pillar: norm.pillar,
    pillar_name: { S: "Security", A: "Adversity", F: "Fidelity", E: "Ecosystem" }[norm.pillar],
    description: norm.description,
    is_essential: norm.is_essential,
    standard_reference: norm.standard_reference,
    issuing_authority: norm.issuing_authority,
    crypto_relevance: norm.crypto_relevance,
    _action: "SHOW_NORM_EXPLANATION",
  };
}

async function getSecurityIncidents({ product_slug, limit = 10 }) {
  let query = supabase
    .from("security_incidents")
    .select("id, title, description, severity, incident_date, amount_lost_usd, source_url, products(name, slug)")
    .order("incident_date", { ascending: false })
    .limit(limit);

  if (product_slug) {
    // Get product ID first
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", product_slug)
      .single();

    if (product) {
      query = query.eq("product_id", product.id);
    }
  }

  const { data: incidents, error } = await query;

  if (error || !incidents?.length) {
    // Retourner des incidents connus si pas de données
    return {
      incidents: [
        { title: "FTX Collapse", date: "2022-11", severity: "critical", amount_lost: "$8B+", type: "CEX" },
        { title: "Ronin Bridge Hack", date: "2022-03", severity: "critical", amount_lost: "$620M", type: "BRIDGE" },
        { title: "Wormhole Exploit", date: "2022-02", severity: "critical", amount_lost: "$320M", type: "BRIDGE" },
      ],
      note: "Données historiques - consultez les sources officielles pour les incidents récents",
      _action: "SHOW_INCIDENTS",
    };
  }

  return {
    incidents: incidents.map(i => ({
      title: i.title,
      description: i.description?.substring(0, 200),
      severity: i.severity,
      date: i.incident_date,
      amount_lost: i.amount_lost_usd ? `$${(i.amount_lost_usd / 1000000).toFixed(1)}M` : null,
      product: i.products?.name,
      source: i.source_url,
    })),
    total: incidents.length,
    _action: "SHOW_INCIDENTS",
    _warning: "Ces incidents montrent l'importance de la diversification et des scores SAFE élevés",
  };
}

async function getAlternatives({ product_slug, min_score_improvement = 10 }) {
  // Get current product
  const current = await getProductScore({ slug: product_slug });
  if (current.error) return current;

  // Find better alternatives of same type
  const { data: alternatives } = await supabase
    .from("products")
    .select(`
      name, slug,
      product_types!inner(code, name),
      safe_scoring_results(note_finale, score_s, score_a, score_f, score_e)
    `)
    .eq("product_types.code", current.type_code || current.type)
    .not("safe_scoring_results", "is", null)
    .gt("safe_scoring_results.note_finale", current.score_safe + min_score_improvement)
    .order("safe_scoring_results(note_finale)", { ascending: false })
    .limit(5);

  if (!alternatives?.length) {
    return {
      current_product: current.name,
      current_score: current.score_safe,
      alternatives: [],
      message: `${current.name} est déjà parmi les meilleurs de sa catégorie !`,
      _action: "SHOW_ALTERNATIVES",
    };
  }

  return {
    current_product: current.name,
    current_score: current.score_safe,
    alternatives: alternatives.map(a => ({
      name: a.name,
      slug: a.slug,
      score: a.safe_scoring_results?.[0]?.note_finale || 0,
      improvement: (a.safe_scoring_results?.[0]?.note_finale || 0) - current.score_safe,
      scores: {
        S: a.safe_scoring_results?.[0]?.score_s || 0,
        A: a.safe_scoring_results?.[0]?.score_a || 0,
        F: a.safe_scoring_results?.[0]?.score_f || 0,
        E: a.safe_scoring_results?.[0]?.score_e || 0,
      },
    })),
    _action: "SHOW_ALTERNATIVES",
    _cta: "ADD_TO_SETUP",
  };
}

async function getSecurityTips({ context = "beginner", product_type, focus = "general" }) {
  const tips = {
    beginner: {
      storage: [
        { priority: "CRITICAL", tip: "N'utilisez JAMAIS un screenshot pour sauvegarder votre seed phrase", why: "Les photos sont souvent synchronisées dans le cloud" },
        { priority: "HIGH", tip: "Écrivez votre seed phrase sur papier et stockez-la dans un lieu sûr", why: "Le papier ne peut pas être hacké" },
        { priority: "HIGH", tip: "Commencez avec un hardware wallet pour les montants > 500€", why: "Protection offline contre 99% des attaques" },
        { priority: "MEDIUM", tip: "Testez votre backup avec un petit montant d'abord", why: "Vérifiez que vous pouvez restaurer avant de stocker plus" },
      ],
      trading: [
        { priority: "HIGH", tip: "Activez le 2FA avec une app (pas SMS)", why: "Le SIM swapping permet de voler les codes SMS" },
        { priority: "HIGH", tip: "Utilisez une adresse email dédiée aux exchanges", why: "Limite l'exposition en cas de breach" },
        { priority: "MEDIUM", tip: "Ne gardez pas tout sur un seul exchange", why: "Diversification = protection contre la faillite" },
      ],
      defi: [
        { priority: "CRITICAL", tip: "Vérifiez TOUJOURS l'URL avant de connecter votre wallet", why: "Les sites de phishing copient les vrais sites" },
        { priority: "HIGH", tip: "Commencez avec de petits montants pour tester", why: "Les bugs de smart contracts sont courants" },
        { priority: "HIGH", tip: "Révoquez les approbations inutilisées (revoke.cash)", why: "Limite l'exposition si un protocole est hacké" },
      ],
      general: [
        { priority: "CRITICAL", tip: "Votre seed phrase = vos fonds. Ne la partagez JAMAIS", why: "Quiconque a la seed contrôle les fonds" },
        { priority: "HIGH", tip: "Méfiez-vous des DM et offres trop belles pour être vraies", why: "99% des DM crypto sont des arnaques" },
        { priority: "HIGH", tip: "Utilisez un gestionnaire de mots de passe", why: "Un mot de passe unique par service" },
      ],
    },
    intermediate: {
      general: [
        { priority: "HIGH", tip: "Utilisez un setup multi-sig pour les gros montants", why: "Nécessite plusieurs signatures pour valider" },
        { priority: "MEDIUM", tip: "Séparez vos wallets: hot wallet (quotidien) / cold wallet (stockage)", why: "Limite l'exposition du gros de vos fonds" },
        { priority: "MEDIUM", tip: "Utilisez un wallet watch-only pour suivre vos fonds", why: "Consultation sans risque de signature accidentelle" },
      ],
    },
    expert: {
      general: [
        { priority: "HIGH", tip: "Envisagez un setup multisig 2-of-3 avec différents fabricants", why: "Protection contre les failles d'un seul fabricant" },
        { priority: "MEDIUM", tip: "Utilisez une passphrase (25ème mot) sur votre seed", why: "Protection additionnelle même si la seed est compromise" },
        { priority: "MEDIUM", tip: "Considérez un schéma Shamir pour distribuer votre backup", why: "Aucun point unique de défaillance" },
      ],
    },
  };

  const levelTips = tips[context] || tips.beginner;
  const focusTips = levelTips[focus] || levelTips.general;

  return {
    context,
    focus,
    tips: focusTips,
    _action: "SHOW_SECURITY_TIPS",
    _note: "Ces conseils sont basés sur la méthodologie SAFE",
  };
}

async function explainProductType({ type_code }) {
  const typeDefinitions = {
    HW_WALLET: {
      name: "Hardware Wallet",
      description: "Appareil physique dédié au stockage sécurisé de vos clés privées offline. Les clés ne quittent jamais l'appareil.",
      examples: ["Ledger Nano X", "Trezor Model T", "Coldcard"],
      risks: ["Perte/vol physique", "Supply chain attacks", "Failles firmware"],
      best_for: "Stockage long terme, montants importants (>1000€)",
      avg_score: 85,
      security_model: "Clés isolées, signature sur l'appareil",
    },
    SW_WALLET: {
      name: "Software Wallet",
      description: "Application mobile ou desktop qui stocke vos clés sur votre appareil. Plus pratique mais moins sécurisé.",
      examples: ["MetaMask", "Trust Wallet", "Rabby"],
      risks: ["Malware", "Phishing", "Compromission de l'appareil"],
      best_for: "Petits montants quotidiens, interaction DeFi",
      avg_score: 65,
      security_model: "Clés sur l'appareil, dépend de la sécurité du device",
    },
    CEX: {
      name: "Exchange Centralisé",
      description: "Plateforme centralisée où vous échangez des cryptos. Vous ne contrôlez PAS vos clés (custodial).",
      examples: ["Binance", "Coinbase", "Kraken"],
      risks: ["Faillite (FTX)", "Hack de la plateforme", "Gel des fonds", "KYC/Régulation"],
      best_for: "Trading actif, on/off ramp fiat",
      avg_score: 55,
      security_model: "Trust the platform - Not your keys, not your coins",
    },
    DEX: {
      name: "Exchange Décentralisé",
      description: "Protocole permettant d'échanger des cryptos sans intermédiaire. Vous gardez le contrôle de vos clés.",
      examples: ["Uniswap", "1inch", "Jupiter"],
      risks: ["Smart contract bugs", "Slippage", "MEV/Front-running", "Liquidité fragmentée"],
      best_for: "Trading non-custodial, tokens non listés",
      avg_score: 70,
      security_model: "Code is law - Smart contracts audités",
    },
    LENDING: {
      name: "Protocole de Lending",
      description: "Plateforme permettant de prêter ou emprunter des cryptos contre intérêts/collatéral.",
      examples: ["Aave", "Compound", "Morpho"],
      risks: ["Liquidation", "Oracle manipulation", "Smart contract risk", "Risque de marché"],
      best_for: "Yield farming, leverage trading",
      avg_score: 60,
      security_model: "Collatéralisation + liquidations automatiques",
    },
    STAKING: {
      name: "Plateforme de Staking",
      description: "Service permettant de participer au consensus PoS et gagner des récompenses.",
      examples: ["Lido", "Rocket Pool", "Coinbase Staking"],
      risks: ["Slashing", "Lock-up period", "Smart contract risk", "Centralisation"],
      best_for: "Revenus passifs sur ETH/SOL/etc",
      avg_score: 65,
      security_model: "Dépend du protocole (liquid vs native)",
    },
    BRIDGE: {
      name: "Bridge Cross-Chain",
      description: "Protocole permettant de transférer des assets entre différentes blockchains.",
      examples: ["Wormhole", "LayerZero", "Stargate"],
      risks: ["TRÈS RISQUÉ - Cible #1 des hackers", "Smart contract complexity", "Centralisation"],
      best_for: "Transferts inter-chains (avec précaution)",
      avg_score: 45,
      security_model: "Multisig ou relayers - Points de défaillance multiples",
    },
  };

  const type = typeDefinitions[type_code];
  if (!type) {
    return {
      error: `Type "${type_code}" non reconnu. Types disponibles: ${Object.keys(typeDefinitions).join(", ")}`,
    };
  }

  return {
    type_code,
    ...type,
    _action: "SHOW_TYPE_EXPLANATION",
    _recommendation: type.avg_score >= 70 ? "Type recommandé" : type.avg_score >= 50 ? "Utiliser avec précaution" : "ATTENTION - Risque élevé",
  };
}

async function getCountryRegulations({ country_code }) {
  const { data: legislation } = await supabase
    .from("crypto_legislation")
    .select("*")
    .eq("country_code", country_code.toUpperCase())
    .single();

  // Fallback data for common countries
  const fallbackData = {
    FR: {
      country: "France",
      status: "Réglementé",
      tax_rate: "30% flat tax (PFU)",
      kyc_required: true,
      defi_allowed: true,
      stablecoin_rules: "MiCA en vigueur 2024",
      notes: "PSAN obligatoire pour les plateformes. Déclaration des comptes étrangers obligatoire.",
      authority: "AMF",
    },
    US: {
      country: "États-Unis",
      status: "Réglementé (fragmenté)",
      tax_rate: "0-37% selon durée de détention",
      kyc_required: true,
      defi_allowed: true,
      stablecoin_rules: "En discussion",
      notes: "SEC vs CFTC. Régulation par État. Très complexe.",
      authority: "SEC, CFTC, FinCEN",
    },
    CH: {
      country: "Suisse",
      status: "Crypto-friendly",
      tax_rate: "Impôt sur la fortune (varie par canton)",
      kyc_required: true,
      defi_allowed: true,
      notes: "Crypto Valley (Zug). Régulation claire et favorable.",
      authority: "FINMA",
    },
    DE: {
      country: "Allemagne",
      status: "Réglementé",
      tax_rate: "0% si détention > 1 an, sinon jusqu'à 45%",
      kyc_required: true,
      defi_allowed: true,
      notes: "Très favorable pour les hodlers long terme.",
      authority: "BaFin",
    },
  };

  const data = legislation || fallbackData[country_code.toUpperCase()];

  if (!data) {
    return {
      error: `Données non disponibles pour ${country_code}. Pays supportés: FR, US, CH, DE`,
      _note: "Consultez un conseiller fiscal pour des informations précises",
    };
  }

  return {
    country_code: country_code.toUpperCase(),
    ...data,
    _action: "SHOW_REGULATIONS",
    _disclaimer: "Information indicative. Consultez un professionnel pour votre situation.",
  };
}

async function calculateRiskExposure({ amount_eur, product_slugs = [] }) {
  let products = [];
  let avgScore = 0;

  if (product_slugs.length > 0) {
    const results = await Promise.all(product_slugs.map(slug => getProductScore({ slug })));
    products = results.filter(r => !r.error);
    avgScore = products.length > 0
      ? Math.round(products.reduce((s, p) => s + p.score_safe, 0) / products.length)
      : 50;
  } else {
    avgScore = 50; // Default assumption
  }

  // Risk calculation
  const riskMultiplier = (100 - avgScore) / 100;
  const riskExposure = Math.round(amount_eur * riskMultiplier);

  // Risk level
  let riskLevel, riskColor, recommendation;
  if (riskExposure < 500) {
    riskLevel = "LOW";
    riskColor = "green";
    recommendation = "Risque acceptable pour ce montant";
  } else if (riskExposure < 2000) {
    riskLevel = "MEDIUM";
    riskColor = "orange";
    recommendation = "Envisagez un hardware wallet pour réduire le risque";
  } else if (riskExposure < 10000) {
    riskLevel = "HIGH";
    riskColor = "red";
    recommendation = "Setup multi-sig fortement recommandé";
  } else {
    riskLevel = "CRITICAL";
    riskColor = "darkred";
    recommendation = "Consultez un expert en custody. Diversification impérative.";
  }

  return {
    amount_eur,
    products_analyzed: products.length,
    average_score: avgScore,
    risk_exposure_eur: riskExposure,
    risk_level: riskLevel,
    risk_percentage: Math.round(riskMultiplier * 100),
    recommendation,
    breakdown: products.map(p => ({
      name: p.name,
      score: p.score_safe,
      risk_contribution: Math.round((100 - p.score_safe) / 100 * amount_eur / products.length),
    })),
    _action: "SHOW_RISK_ANALYSIS",
    _upsell: riskLevel !== "LOW" ? "premium" : null,
  };
}

async function suggestOptimalSetup({ budget_eur, risk_profile, use_case = "mixed" }) {
  const setups = {
    conservative: {
      hodl: {
        products: ["ledger-nano-x", "trezor-model-t"],
        allocation: { hardware_wallet: 100 },
        description: "100% hardware wallet pour stockage ultra-sécurisé",
      },
      trading: {
        products: ["ledger-nano-x", "kraken"],
        allocation: { hardware_wallet: 80, cex: 20 },
        description: "80% en cold storage, 20% max sur exchange réputé",
      },
      defi: {
        products: ["ledger-nano-x", "rabby-wallet"],
        allocation: { hardware_wallet: 90, hot_wallet: 10 },
        description: "Hardware wallet comme base, hot wallet minimal pour gas",
      },
      mixed: {
        products: ["ledger-nano-x", "kraken", "metamask"],
        allocation: { hardware_wallet: 70, cex: 20, hot_wallet: 10 },
        description: "Setup diversifié conservateur",
      },
    },
    moderate: {
      hodl: {
        products: ["ledger-nano-x"],
        allocation: { hardware_wallet: 100 },
        description: "Hardware wallet pour sécurité optimale",
      },
      trading: {
        products: ["ledger-nano-x", "binance", "kraken"],
        allocation: { hardware_wallet: 60, cex: 40 },
        description: "Mix hardware + exchanges pour flexibilité",
      },
      defi: {
        products: ["ledger-nano-x", "rabby-wallet", "aave"],
        allocation: { hardware_wallet: 50, defi: 40, hot_wallet: 10 },
        description: "Balance sécurité et yield",
      },
      mixed: {
        products: ["ledger-nano-x", "binance", "metamask", "aave"],
        allocation: { hardware_wallet: 50, cex: 25, defi: 20, hot_wallet: 5 },
        description: "Setup équilibré multi-usage",
      },
    },
    aggressive: {
      trading: {
        products: ["binance", "bybit", "metamask"],
        allocation: { cex: 60, hot_wallet: 40 },
        description: "ATTENTION: Setup risqué pour trading actif uniquement",
      },
      defi: {
        products: ["metamask", "aave", "uniswap"],
        allocation: { defi: 70, hot_wallet: 30 },
        description: "ATTENTION: Exposition DeFi maximale",
      },
      mixed: {
        products: ["ledger-nano-x", "binance", "aave", "metamask"],
        allocation: { hardware_wallet: 30, cex: 30, defi: 30, hot_wallet: 10 },
        description: "Setup diversifié à haut risque",
      },
    },
  };

  const setup = setups[risk_profile]?.[use_case] || setups.moderate.mixed;

  // Get actual product scores
  const productScores = await Promise.all(
    setup.products.map(slug => getProductScore({ slug }))
  );
  const validProducts = productScores.filter(p => !p.error);

  const avgScore = validProducts.length > 0
    ? Math.round(validProducts.reduce((s, p) => s + p.score_safe, 0) / validProducts.length)
    : 0;

  return {
    risk_profile,
    use_case,
    budget_eur,
    description: setup.description,
    allocation: setup.allocation,
    recommended_products: validProducts.map(p => ({
      name: p.name,
      slug: p.slug,
      score: p.score_safe,
      type: p.type,
    })),
    estimated_setup_score: avgScore,
    total_cost: budget_eur ? `~${Math.round(budget_eur * 0.02)}€ en frais hardware` : "Variable",
    _action: "SHOW_OPTIMAL_SETUP",
    _cta: "ADD_ALL_TO_SETUP",
    _warning: risk_profile === "aggressive" ? "Ce profil comporte des risques élevés" : null,
  };
}

async function getPillarDeepAnalysis({ product_slug, pillar }) {
  const { data: product } = await supabase
    .from("products")
    .select(`
      name, slug,
      evaluations(
        result,
        norms(code, title, description, pillar, is_essential)
      )
    `)
    .eq("slug", product_slug)
    .single();

  if (!product) return { error: `Produit "${product_slug}" non trouvé` };

  const pillarEvals = (product.evaluations || []).filter(e => e.norms?.pillar === pillar);

  const passed = pillarEvals.filter(e => e.result === "YES" || e.result === "YESP");
  const failed = pillarEvals.filter(e => e.result === "NO");
  const essential_failed = failed.filter(e => e.norms?.is_essential);

  const pillarNames = { S: "Security", A: "Adversity", F: "Fidelity", E: "Efficiency" };
  const pillarDescriptions = {
    S: "Fondations cryptographiques: encryption, signatures, gestion des clés, secure element",
    A: "Résistance à la coercition: duress PIN, hidden wallets, protection attaques physiques",
    F: "Fiabilité long-terme: audits sécurité, bug bounty, réponse CVE, open source",
    E: "Utilisabilité: multi-chain, UX, backup/recovery, transactions claires",
  };

  return {
    product: product.name,
    pillar,
    pillar_name: pillarNames[pillar],
    pillar_description: pillarDescriptions[pillar],
    score: pillarEvals.length > 0 ? Math.round((passed.length / (passed.length + failed.length)) * 100) : 0,
    stats: {
      total_norms: pillarEvals.length,
      passed: passed.length,
      failed: failed.length,
      essential_failed: essential_failed.length,
    },
    key_strengths: passed.slice(0, 5).map(e => ({
      code: e.norms.code,
      title: e.norms.title,
      essential: e.norms.is_essential,
    })),
    key_weaknesses: failed.slice(0, 5).map(e => ({
      code: e.norms.code,
      title: e.norms.title,
      essential: e.norms.is_essential,
      description: e.norms.description?.substring(0, 100),
    })),
    _action: "SHOW_PILLAR_ANALYSIS",
    _upsell: essential_failed.length > 0 ? "detailed" : null,
  };
}

// =============================================================================
// NAVIGATION TOOL IMPLEMENTATION
// =============================================================================

async function navigateToPage({ page, product_slug, product_slugs, context }) {
  const pages = {
    products: { path: "/products", label: "Catalogue produits", description: "Explorez tous les produits crypto évalués avec leurs scores SAFE" },
    leaderboard: { path: "/leaderboard", label: "Classement SAFE", description: "Découvrez les produits les mieux notés par catégorie" },
    compare: { path: "/compare", label: "Comparateur", description: "Comparez jusqu'à 4 produits côte à côte" },
    methodology: { path: "/methodology", label: "Méthodologie SAFE", description: "Comprenez comment les scores SAFE sont calculés" },
    dashboard: { path: "/dashboard", label: "Mon dashboard", description: "Accédez à votre espace personnel" },
    setups: { path: "/dashboard/setups", label: "Mes setups", description: "Gérez vos configurations crypto" },
    incidents: { path: "/incidents", label: "Incidents sécurité", description: "Consultez les hacks et failles récentes" },
    map: { path: "/map", label: "Carte mondiale", description: "Visualisez la sécurité crypto par région" },
    blog: { path: "/blog", label: "Blog & guides", description: "Articles et guides de sécurité crypto" },
    about: { path: "/about", label: "À propos", description: "En savoir plus sur SafeScoring" },
    pricing: { path: "/dashboard/settings", label: "Tarifs Pro", description: "Découvrez les avantages du plan Pro" },
    product_detail: { path: `/products/${product_slug || ""}`, label: "Détail produit", description: "Voir la fiche complète du produit" },
    compare_products: {
      path: product_slugs?.length >= 2 ? `/compare/${product_slugs.join("/")}` : "/compare",
      label: "Comparaison",
      description: "Comparer les produits sélectionnés"
    },
  };

  const pageInfo = pages[page];
  if (!pageInfo) {
    return { error: `Page inconnue: ${page}. Pages disponibles: ${Object.keys(pages).join(", ")}` };
  }

  return {
    page,
    path: pageInfo.path,
    label: pageInfo.label,
    description: pageInfo.description,
    context: context || `Navigation vers ${pageInfo.label}`,
    _action: "NAVIGATE",
    _message: `👉 Cliquez pour accéder à: ${pageInfo.label}`,
  };
}

// Tool executor
async function executeTool(name, args, userId) {
  switch (name) {
    case "search_products": return searchProducts(args);
    case "get_product_score": return getProductScore(args);
    case "compare_products": return compareProducts(args);
    case "get_best_by_type": return getBestByType(args);
    case "analyze_setup": return analyzeSetup(args, userId);
    case "add_to_setup": return addToSetup(args, userId);
    case "manage_user_setup": return manageUserSetup(args, userId);
    case "offer_paid_report": return offerPaidReport(args);
    case "check_compatibility": return checkCompatibility(args);
    case "web_search": return webSearch(args);
    // Nouveaux tools SafeScoring
    case "explain_norm": return explainNorm(args);
    case "get_security_incidents": return getSecurityIncidents(args);
    case "get_alternatives": return getAlternatives(args);
    case "get_security_tips": return getSecurityTips(args);
    case "explain_product_type": return explainProductType(args);
    case "get_country_regulations": return getCountryRegulations(args);
    case "calculate_risk_exposure": return calculateRiskExposure(args);
    case "suggest_optimal_setup": return suggestOptimalSetup(args);
    case "get_pillar_deep_analysis": return getPillarDeepAnalysis(args);
    // Navigation
    case "navigate_to_page": return navigateToPage(args);
    default: return { error: `Outil inconnu: ${name}` };
  }
}

// =============================================================================
// SYSTEM PROMPTS (FR + EN)
// =============================================================================

const SYSTEM_PROMPT_FR = `Tu es l'Assistant IA SafeScoring, expert en sécurité crypto et self-custody.

## RÈGLES DE VÉRACITÉ ABSOLUES (ANTI-HALLUCINATION)
1. Tu ne peux JAMAIS inventer de données. Si tu n'as pas l'info via un tool, dis "Je n'ai pas cette information dans notre base"
2. Chaque score DOIT venir de get_product_score ou search_products - JAMAIS de ta mémoire
3. Si un produit n'existe pas dans Supabase, dis-le clairement: "Ce produit n'est pas encore dans notre base"
4. Distingue TOUJOURS: "Selon nos données vérifiées: X" vs "Information générale: Y"
5. Ne jamais extrapoler les scores ou inventer des fonctionnalités produit
6. Si les données sont anciennes (>30 jours), mentionne-le

## RÈGLES OPÉRATIONNELLES
1. TOUJOURS inclure le score SAFE quand tu parles d'un produit: "Score SAFE: XX/100 (S:XX A:XX F:XX E:XX)"
2. Tu peux DIRECTEMENT modifier les setups utilisateur via manage_user_setup (créer, ajouter/retirer produits)
3. Le dashboard se met à jour EN TEMPS RÉEL quand tu modifies un setup - informe l'utilisateur
4. Proposer un rapport payant détaillé quand l'utilisateur veut plus d'infos
5. Donner des conseils de sécurité CONCRETS et ACTIONNABLES

## RAISONNEMENT OBLIGATOIRE (Chain of Thought)
Avant de répondre sur un produit ou score:
1. Ai-je appelé un tool pour obtenir des données FACTUELLES? Si non, appeler le tool approprié
2. Les données retournées sont-elles complètes? Si non, mentionner les limites
3. Ma réponse est-elle 100% supportée par les données du tool?
4. Y a-t-il des incertitudes à signaler à l'utilisateur?`;

const SYSTEM_PROMPT_EN = `You are the SafeScoring AI Assistant, expert in crypto security and self-custody.

## ABSOLUTE TRUTH RULES (ANTI-HALLUCINATION)
1. You can NEVER invent data. If you don't have info via a tool, say "I don't have this information in our database"
2. Every score MUST come from get_product_score or search_products - NEVER from your memory
3. If a product doesn't exist in Supabase, say it clearly: "This product is not yet in our database"
4. ALWAYS distinguish: "According to our verified data: X" vs "General information: Y"
5. Never extrapolate scores or invent product features
6. If data is old (>30 days), mention it

## OPERATIONAL RULES
1. ALWAYS include the SAFE score when discussing a product: "SAFE Score: XX/100 (S:XX A:XX F:XX E:XX)"
2. You can DIRECTLY modify user setups via manage_user_setup (create, add/remove products)
3. The dashboard updates in REAL-TIME when you modify a setup - inform the user
4. Offer a detailed paid report when the user wants more info
5. Give CONCRETE and ACTIONABLE security advice

## MANDATORY REASONING (Chain of Thought)
Before answering about a product or score:
1. Did I call a tool to get FACTUAL data? If not, call the appropriate tool
2. Is the returned data complete? If not, mention the limitations
3. Is my answer 100% supported by the tool data?
4. Are there uncertainties to report to the user?`;

const SYSTEM_PROMPT_COMMON = `

## Méthodologie SAFE (4 piliers, 25% chacun)
- **S (Security)**: Fondations cryptographiques - encryption (AES-256, ChaCha20), signatures (ECDSA, EdDSA), gestion des clés, secure element
- **A (Adversity)**: Résistance à la coercition - duress PIN, hidden wallets, plausible deniability, protection contre attaques physiques
- **F (Fidelity)**: Fiabilité long-terme - audits sécurité, bug bounty, réponse CVE, open source, track record
- **E (Efficiency)**: Utilisabilité - multi-chain, UX, backup/recovery, transactions claires, accessibilité

## Tes 20 outils

### Produits & Scores
- search_products: Chercher des produits avec scores
- get_product_score: Score SAFE détaillé par pilier
- compare_products: Comparer 2-4 produits
- get_best_by_type: Top par catégorie (HW_WALLET, CEX, DEX...)
- get_alternatives: Trouver des alternatives plus sécurisées
- check_compatibility: Vérifier compatibilité entre produits

### Setup & Analyse
- analyze_setup: Analyser un setup complet avec recommandations
- add_to_setup: Proposer ajout au setup (bouton UI)
- manage_user_setup: MODIFIER DIRECTEMENT les setups (créer, ajouter/retirer produits) - le dashboard se met à jour en temps réel!
- suggest_optimal_setup: Recommander un setup selon budget/profil
- calculate_risk_exposure: Calculer l'exposition au risque en €

### Éducation & Conseils
- explain_norm: Expliquer une norme (BIP-39, EIP-712...)
- explain_product_type: Expliquer CEX, DEX, HW_WALLET...
- get_security_tips: Conseils de sécurité personnalisés
- get_pillar_deep_analysis: Analyse détaillée d'un pilier SAFE

### Navigation & Informations
- navigate_to_page: NAVIGUER vers une page du site (products, leaderboard, compare, methodology, dashboard, setups, incidents, map, blog, pricing)
- get_security_incidents: Hacks et exploits récents
- get_country_regulations: Réglementation crypto par pays
- offer_paid_report: Proposer rapport détaillé payant
- web_search: Recherche web (dernier recours)

## IMPORTANT: Navigation
Quand l'utilisateur veut VOIR, ACCÉDER, EXPLORER une page, utilise navigate_to_page:
- "Montre-moi les produits" → navigate_to_page(page: "products")
- "Je veux voir le classement" → navigate_to_page(page: "leaderboard")
- "Comment vous calculez les scores?" → navigate_to_page(page: "methodology")
- "Mon dashboard" → navigate_to_page(page: "dashboard")
- "Comparer Ledger et Trezor" → compare_products PUIS navigate_to_page(page: "compare_products", product_slugs: [...])
- "Voir la page du Ledger" → navigate_to_page(page: "product_detail", product_slug: "ledger-nano-x")

## Comportement
- Utilise les données Supabase (vérifiées) en priorité
- Sois factuel et objectif sur les scores - pas de marketing
- Propose toujours une action concrète
- Réponds dans la langue de l'utilisateur
- Mentionne les risques spécifiques de chaque type de produit

## Upsell intelligent vers les abonnements
Les plans disponibles:
- **Free**: Scores illimités, 1 setup (gratuit)
- **Explorer ($19/mois)**: 5 setups, comparaisons avancées, export PDF, email support
- **Professional ($39/mois)**: 20 setups, accès API, suivi scores, support prioritaire
- **Enterprise ($499/mois)**: Tout illimité, onboarding dédié, support prioritaire (<4h), évaluations custom, SSO (sur demande), compliance

Quand proposer un upgrade avec offer_paid_report:

→ **Explorer** ($19/mois, 14j essai gratuit):
- Comparaisons avancées demandées → trigger: "comparison"
- Export PDF demandé → trigger: "pdf_export"
- Plus de 1 setup (jusqu'à 5) → trigger: "multiple_setups"

→ **Professional** ($39/mois, 14j essai gratuit):
- Accès API demandé → trigger: "api_access"
- Suivi des scores dans le temps → trigger: "score_tracking"
- Analyse approfondie avec toutes les normes → trigger: "advanced_analysis"
- Beaucoup de setups (jusqu'à 20) → trigger: "many_setups"

→ **Enterprise** ($499/mois, contacter pour démo):
- Partage avec une équipe / SSO → trigger: "team"
- Accès illimité sans restrictions → trigger: "unlimited"
- Besoin de SLA ou support garanti → trigger: "sla"
- Rapports compliance / audit trail → trigger: "compliance"
- Évaluations de produits sur demande → trigger: "custom_evaluation"

Reste utile même sans achat - ne force jamais, propose naturellement.

Stay helpful even without a purchase - never force, propose naturally.`;

// Fonction pour obtenir le prompt selon la langue
function getSystemPrompt(language = "fr") {
  const isEnglish = language === "en" || language?.startsWith("en");
  const intro = isEnglish ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_FR;
  return intro + SYSTEM_PROMPT_COMMON;
}

// =============================================================================
// VALIDATION POST-RÉPONSE (Anti-hallucination)
// =============================================================================

/**
 * Détecte les patterns d'affirmations non vérifiées dans la réponse
 */
const UNVERIFIED_CLAIM_PATTERNS = [
  { pattern: /score\s*(safe|SAFE)?\s*:?\s*(\d{1,3})\s*\/?\s*100/gi, type: "score" },
  { pattern: /(\d{1,3})\s*\/\s*100/g, type: "score" },
  { pattern: /le meilleur\s+(\w+)\s+est\s+(\w+)/gi, type: "ranking" },
  { pattern: /a\s+(perdu|été\s+hacké|subi)\s+(\d+)\s*(millions?|M|milliards?|B)?\s*(\$|€|dollars?|euros?)/gi, type: "incident" },
];

/**
 * Extrait les claims de scores de la réponse
 */
function extractScoreClaims(response) {
  const claims = [];
  const scorePattern = /(\w[\w\s-]+?)\s*(?:a|avec|:)?\s*(?:un\s+)?score\s*(?:safe|SAFE)?\s*(?:de|:)?\s*(\d{1,3})/gi;
  let match;
  while ((match = scorePattern.exec(response)) !== null) {
    claims.push({
      product: match[1].trim().toLowerCase(),
      score: parseInt(match[2], 10),
      fullMatch: match[0]
    });
  }
  return claims;
}

/**
 * Valide que les scores mentionnés correspondent aux données des tools
 */
function validateResponseAgainstToolData(response, toolResults) {
  const issues = [];
  const scoreClaims = extractScoreClaims(response);

  // Construire un map des scores retournés par les tools
  const toolScores = new Map();
  for (const result of toolResults) {
    if (result.score_safe !== undefined) {
      toolScores.set(result.slug?.toLowerCase(), result.score_safe);
      toolScores.set(result.name?.toLowerCase(), result.score_safe);
    }
    if (result.products) {
      for (const p of result.products) {
        toolScores.set(p.slug?.toLowerCase(), p.score_safe);
        toolScores.set(p.name?.toLowerCase(), p.score_safe);
      }
    }
    if (result.ranking) {
      for (const p of result.ranking) {
        toolScores.set(p.slug?.toLowerCase(), p.score_safe);
        toolScores.set(p.name?.toLowerCase(), p.score_safe);
      }
    }
  }

  // Vérifier chaque claim
  for (const claim of scoreClaims) {
    const expectedScore = toolScores.get(claim.product);
    if (expectedScore !== undefined && Math.abs(expectedScore - claim.score) > 2) {
      issues.push({
        type: "score_mismatch",
        product: claim.product,
        claimed: claim.score,
        actual: expectedScore,
        message: `Score incorrect pour "${claim.product}": réponse dit ${claim.score}, données = ${expectedScore}`
      });
    }
  }

  // Détecter les affirmations sans données tools
  if (toolResults.length === 0 && scoreClaims.length > 0) {
    issues.push({
      type: "unverified_claims",
      message: "Des scores sont mentionnés sans appel aux tools de vérification"
    });
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

// =============================================================================
// AI CALL WITH TOOLS
// =============================================================================

async function callAI(messages, userId, provider = null, userMessage = "", retryCount = 0) {
  // Auto-select provider avec load balancing
  const isSimple = isSimpleQuestion(userMessage);
  const selectedProvider = provider || getAvailableProvider(isSimple);
  const config = AI_CONFIG[selectedProvider];

  if (!config?.getKey()) {
    // Fallback: essayer tous les providers
    for (const [name, cfg] of Object.entries(AI_CONFIG)) {
      if (cfg.getKey()) {
        return callAI(messages, userId, name, userMessage);
      }
    }
    throw new Error("No AI provider configured");
  }

  const apiKey = config.getKey();

  let currentMessages = [...messages];
  let toolsUsed = [];
  let actions = [];
  let toolResults = []; // Pour validation

  for (let i = 0; i < 5; i++) {
    // Appel direct (sans file d'attente pour simplifier)
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: currentMessages,
        temperature: 0.1,  // Bas pour réponses factuelles et déterministes
        max_tokens: 2000,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`[${selectedProvider}] API error ${res.status}:`, errorText.slice(0, 200));

      // Rate limit (429) ou erreur serveur (5xx) → circuit breaker + fallback + retry
      if (res.status === 429 || res.status >= 500) {
        recordProviderFailure(selectedProvider);

        const otherProviders = Object.keys(AI_CONFIG).filter(
          p => p !== selectedProvider && AI_CONFIG[p].getKey() && isProviderAvailable(p)
        );

        // Fallback vers un autre provider disponible
        if (otherProviders.length > 0) {
          const fallback = otherProviders[Math.floor(Math.random() * otherProviders.length)];
          console.log(`[${selectedProvider}] Erreur ${res.status}, fallback to ${fallback}`);
          return callAI(messages, userId, fallback, userMessage);
        }

        // Tous les providers busy → retry avec backoff exponentiel + jitter
        const nextRetry = retryCount + 1;
        const maxRetries = 5; // Plus de retries

        if (nextRetry <= maxRetries) {
          // Backoff exponentiel avec jitter: 1s, 2s, 4s, 8s, 16s (max)
          const baseBackoff = Math.min(1000 * Math.pow(2, retryCount), 16000);
          const jitter = Math.floor(Math.random() * 500); // 0-500ms de jitter
          const backoffMs = baseBackoff + jitter;
          console.log(`[Retry ${nextRetry}/${maxRetries}] Tous providers busy, attente ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));

          // Reset circuit breakers pour réessayer
          for (const [name] of Object.entries(AI_CONFIG).filter(([_, c]) => c.getKey())) {
            circuitBreaker.delete(name);
          }
          return callAI(messages, userId, null, userMessage, nextRetry);
        }
      }
      throw new Error(`AI API error: ${res.status}`);
    }

    const data = await res.json();
    const msg = data.choices[0].message;

    // Circuit breaker: marquer le succès
    recordProviderSuccess(selectedProvider);

    if (!msg.tool_calls?.length) {
      // VALIDATION POST-RÉPONSE
      const validation = validateResponseAgainstToolData(msg.content || "", toolResults);

      return {
        response: msg.content,
        model: config.model,
        provider: selectedProvider, // Pour monitoring
        toolsUsed,
        actions,
        _validation: {
          passed: validation.valid,
          issues: validation.issues,
          tool_results_count: toolResults.length,
        }
      };
    }

    currentMessages.push(msg);

    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      const result = await executeTool(call.function.name, args, userId);

      toolsUsed.push({ tool: call.function.name, args });
      toolResults.push(result); // Stocker pour validation
      if (result._action) actions.push({ type: result._action, data: result });

      currentMessages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    response: "Analyse incomplète. Reformulez votre question.",
    model: config.model,
    toolsUsed,
    actions,
    _validation: { passed: false, issues: [{ type: "incomplete", message: "Trop d'itérations" }] }
  };
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request) {
  // =========================================================================
  // PROTECTION 1: Limite de requêtes concurrentes
  // =========================================================================
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return NextResponse.json({
      error: "Server overloaded, please retry in a few seconds",
      errorFr: "Serveur surchargé, réessayez dans quelques secondes",
      retryAfter: 5,
    }, {
      status: 503,
      headers: { "Retry-After": "5" }
    });
  }

  activeRequests++;

  try {
    // Security: validate origin (désactivé pour tests locaux)
    // const originCheck = validateRequestOrigin(request);
    // if (!originCheck.valid) {
    //   return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    // }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Check if any AI provider is configured
    const hasAnyAIProvider = getGroqKeys().length > 0 ||
                             getOpenRouterKeys().length > 0 ||
                             getCerebrasKeys().length > 0;

    if (!hasAnyAIProvider) {
      // Claude Code Only mode - AI chat disabled, use static data
      return NextResponse.json({
        message: "L'assistant IA est désactivé. Utilisez la recherche de produits ou consultez les scores directement.",
        messageEn: "AI assistant is disabled. Use product search or view scores directly.",
        suggestions: [
          { text: "Voir le leaderboard", link: "/leaderboard" },
          { text: "Comparer des produits", link: "/compare" },
          { text: "Explorer les produits", link: "/products" },
        ],
        _mode: "claude_code_only",
      });
    }

    const session = await auth();
    const userId = session?.user?.id;
    const isAnonymous = !userId;

    // Rate limiting for authenticated users
    if (userId) {
      const rateLimit = await checkRateLimit(userId);
      if (!rateLimit.allowed) {
        return NextResponse.json({
          error: rateLimit.message,
          errorFr: rateLimit.messageFr,
          reason: rateLimit.reason,
          resetAt: rateLimit.resetAt,
          remaining: 0,
        }, { status: 429 });
      }
    }

    // Anonymous users can chat but with limited features
    const { message, history = [], userSetup = [], language = "fr" } = await request.json();

    // =========================================================================
    // PROTECTION 2: Cache pour requêtes fréquentes
    // =========================================================================
    const cached = getCachedResponse(message);
    if (cached) {
      return NextResponse.json({
        ...cached,
        _cached: true,
        _cacheHit: true,
      });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Load user context
    const { data: memories } = await supabase
      .from("user_memories")
      .select("content, category")
      .eq("user_id", userId)
      .eq("is_deleted", false)
      .limit(10);

    // Sélectionner le prompt selon la langue (fr ou en)
    let systemPrompt = getSystemPrompt(language);
    if (memories?.length) {
      const memoryHeader = language === "en" ? "## User context" : "## Contexte utilisateur";
      systemPrompt += `\n\n${memoryHeader}\n${memories.map(m => `- ${m.content}`).join("\n")}`;
    }
    if (userSetup.length) {
      const setupHeader = language === "en" ? "## Current setup" : "## Setup actuel";
      systemPrompt += `\n\n${setupHeader}: ${userSetup.join(", ")}`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10),
      { role: "user", content: message },
    ];

    // =========================================================================
    // PROTECTION 3: Throttle global pour éviter les pics
    // Délai aléatoire 0-300ms pour étaler les requêtes
    // =========================================================================
    const throttleDelay = Math.floor(Math.random() * 300);
    await new Promise(r => setTimeout(r, throttleDelay));

    // Load balancing automatique entre providers
    const result = await callAI(messages, userId, null, message);

    // Extract actions for UI (including navigation)
    const uiActions = result.actions.filter(a =>
      ["PROMPT_ADD_TO_SETUP", "SHOW_UPSELL", "SHOW_SCORE_CARD", "SHOW_COMPARISON", "SHOW_RANKING", "WEB_SEARCH_SUCCESS", "NAVIGATE", "SHOW_PRODUCTS", "SHOW_INCIDENTS", "SHOW_ALTERNATIVES", "SHOW_OPTIMAL_SETUP"].includes(a.type)
    );

    // Get remaining messages for user feedback
    const remaining = userId ? await getRemainingMessages(userId) : { remaining: -1, limit: -1, plan: "anonymous" };

    // =============================================================================
    // FUNNEL D'INSCRIPTION NATUREL POUR UTILISATEURS ANONYMES
    // =============================================================================
    let signupPrompt = null;
    if (isAnonymous) {
      const hasSetupAction = uiActions.some(a => a.type === "PROMPT_ADD_TO_SETUP" || a.type === "SHOW_OPTIMAL_SETUP");
      const hasProductAction = uiActions.some(a => ["SHOW_SCORE_CARD", "SHOW_COMPARISON", "SHOW_PRODUCTS", "SHOW_ALTERNATIVES"].includes(a.type));
      const hasRiskAction = uiActions.some(a => a.type === "SHOW_RISK_ANALYSIS");
      const messageCount = history.length;

      // Funnel progressif basé sur l'engagement
      if (hasSetupAction) {
        // Moment clé: l'utilisateur veut sauvegarder un setup
        signupPrompt = {
          trigger: "SAVE_SETUP",
          priority: "HIGH",
          title: "Sauvegardez votre setup",
          message: "Créez un compte gratuit pour sauvegarder cette configuration et suivre vos scores SAFE",
          cta: "Créer mon compte gratuit",
          ctaSecondary: "Continuer sans compte",
          benefits: [
            "Sauvegarde illimitée de setups",
            "Alertes si un score change",
            "Historique de vos analyses"
          ],
          urgency: "Vos données seront perdues à la fermeture",
        };
      } else if (hasRiskAction) {
        // L'utilisateur calcule son risque - moment de conversion
        signupPrompt = {
          trigger: "RISK_ANALYSIS",
          priority: "HIGH",
          title: "Protégez votre analyse",
          message: "Inscrivez-vous pour sauvegarder cette analyse de risque et recevoir des alertes personnalisées",
          cta: "Sécuriser mon analyse",
          ctaSecondary: "Plus tard",
          benefits: [
            "Suivi de votre exposition",
            "Alertes incidents sur vos produits",
            "Recommandations personnalisées"
          ],
        };
      } else if (hasProductAction && messageCount >= 2) {
        // Engagement produit après quelques échanges
        signupPrompt = {
          trigger: "PRODUCT_INTEREST",
          priority: "MEDIUM",
          title: "Suivez ces produits",
          message: "Créez un compte pour ajouter ces produits à votre watchlist et être alerté des changements",
          cta: "Créer ma watchlist",
          ctaSecondary: "Non merci",
          benefits: [
            "Watchlist personnalisée",
            "Notifications de mise à jour",
            "Comparaisons sauvegardées"
          ],
        };
      } else if (messageCount >= 4) {
        // Après plusieurs messages, proposer de sauvegarder la conversation
        signupPrompt = {
          trigger: "CONVERSATION_VALUE",
          priority: "LOW",
          title: "Gardez cette conversation",
          message: "Inscrivez-vous pour sauvegarder notre échange et reprendre plus tard",
          cta: "Sauvegarder",
          ctaSecondary: "Continuer",
          benefits: [
            "Historique illimité",
            "Mémoire de vos préférences",
            "Assistant personnalisé"
          ],
        };
      }
    }

    // Générer un ID unique pour le message (pour feedback)
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      response: result.response,
      model: result.model,
      actions: uiActions,
      toolsUsed: result.toolsUsed,
      isAnonymous,
      signupPrompt,
      usage: {
        remaining: remaining.remaining,
        limit: remaining.limit,
        plan: remaining.plan,
      },
      // SYSTÈME DE FEEDBACK pour amélioration continue
      _feedback: {
        messageId,
        enabled: true,
        question: "Cette réponse était-elle correcte et utile?",
        options: [
          { value: "accurate", label: "Précise et utile" },
          { value: "partially", label: "Partiellement correcte" },
          { value: "inaccurate", label: "Information incorrecte" },
          { value: "outdated", label: "Données obsolètes" },
        ]
      },
      // MÉTADONNÉES DE QUALITÉ
      _quality: {
        validation_passed: result._validation?.passed ?? true,
        validation_issues: result._validation?.issues || [],
        tools_called: result.toolsUsed?.length || 0,
        data_sources: result.toolsUsed?.map(t => t.tool) || [],
      },
    });

  } catch (error) {
    console.error("Autonomous chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // PROTECTION: Toujours décrémenter le compteur
    activeRequests--;
  }
}

export async function GET() {
  // Endpoint de monitoring
  const availableProviders = Object.entries(AI_CONFIG)
    .filter(([name, cfg]) => cfg.getKey() && isProviderAvailable(name))
    .map(([name]) => name);

  return NextResponse.json({
    status: "ok",
    activeRequests,
    maxConcurrent: MAX_CONCURRENT_REQUESTS,
    cacheSize: responseCache.size,
    availableProviders,
    tools: TOOLS.map(t => t.function.name),
    features: ["anti_hallucination", "validation", "confidence_metadata", "feedback", "circuit_breaker", "cache", "load_balancing"],
  });
}

// =============================================================================
// FEEDBACK ENDPOINT - Amélioration continue
// =============================================================================

export async function PUT(request) {
  try {
    const { messageId, rating, correction, context } = await request.json();

    if (!messageId || !rating) {
      return NextResponse.json({ error: "messageId et rating requis" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id;

    // Stocker le feedback pour analyse
    const { error } = await supabase.from("chat_feedback").insert({
      message_id: messageId,
      user_id: userId,
      rating,
      correction: correction || null,
      context: context || null,
      created_at: new Date().toISOString(),
    });

    // Si erreur (table n'existe pas), log silencieusement
    if (error) {
      console.warn("[Chat Feedback] Could not store feedback:", error.message);
      // Ne pas échouer - le feedback est optionnel
    }

    // Si correction fournie et rating négatif, ajouter aux memories pour apprentissage
    if (correction && (rating === "inaccurate" || rating === "outdated") && userId) {
      await supabase.from("user_memories").insert({
        user_id: userId,
        content: `CORRECTION: ${correction}`,
        category: "chat_correction",
        is_deleted: false,
        created_at: new Date().toISOString(),
      }).catch(() => {}); // Ignorer si échoue
    }

    return NextResponse.json({
      success: true,
      message: "Merci pour votre feedback! Il nous aide à améliorer la qualité des réponses.",
    });

  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
