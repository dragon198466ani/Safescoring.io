/**
 * Tests des configurations du chatbot SafeBot
 *
 * Ce fichier contient les prompts de test pour vérifier
 * toutes les fonctionnalités du chatbot autonome.
 *
 * Usage: Copier les prompts dans le chat pour tester
 */

// ============================================================
// 1. TESTS DE GESTION DES SETUPS (manage_user_setup)
// ============================================================

const SETUP_TESTS = {
  // Test 1.1: Créer un nouveau setup
  create_setup: [
    "Crée-moi un nouveau setup appelé 'Mon Portfolio DeFi'",
    "Je veux créer un setup pour mes wallets hardware",
    "Nouveau setup: Test Sécurité Maximum",
  ],

  // Test 1.2: Ajouter un produit au setup
  add_product: [
    "Ajoute Ledger Nano X à mon setup",
    "Mets Trezor Model T dans mon portfolio",
    "Ajoute Uniswap à mon setup DeFi comme protocol defi",
    "Je veux ajouter Kraken comme exchange à mon setup",
  ],

  // Test 1.3: Retirer un produit du setup
  remove_product: [
    "Retire MetaMask de mon setup",
    "Enlève Coinbase de mon portfolio",
    "Supprime le dernier produit ajouté",
  ],

  // Test 1.4: Renommer un setup
  rename_setup: [
    "Renomme mon setup en 'Portfolio Sécurisé 2025'",
    "Change le nom de mon setup principal",
  ],
};

// ============================================================
// 2. TESTS FREEMIUM (rate limiting)
// ============================================================

const FREEMIUM_TESTS = {
  // Ces tests vérifient l'affichage des limites
  usage_display: [
    // L'indicateur doit montrer X/10 pour Free
    // X/50 pour Explorer, X/200 pour Professional
    // "Illimité" pour Enterprise
  ],

  // Test de dépassement (simulé)
  limit_reached: [
    // Quand remaining === 0, l'input doit être bloqué
    // et un CTA upgrade doit apparaître
  ],

  // Plans affichés dans config.js
  expected_limits: {
    free: { daily: 10, perMinute: 3 },
    explorer: { daily: 50, perMinute: 5 },
    professional: { daily: 200, perMinute: 15 },
    enterprise: { daily: -1, perMinute: 30 }, // Unlimited
  },
};

// ============================================================
// 3. TESTS QUICK ACTION SUGGESTIONS
// ============================================================

const SUGGESTION_TESTS = {
  // Suggestions initiales (nouvelle conversation)
  initial_suggestions: [
    { icon: "🏆", text: "Top 5 wallets sécurisés" },
    { icon: "⚔️", text: "Ledger vs Trezor" },
    { icon: "🔍", text: "Analyser mon setup" },
    { icon: "📊", text: "Meilleur exchange" },
  ],

  // Suggestions contextuelles après certaines réponses
  contextual_triggers: {
    after_product_score: "Ajouter au setup",
    after_comparison: "Voir rapport complet",
    after_setup_analysis: "Améliorer sécurité",
  },
};

// ============================================================
// 4. TESTS RECHERCHE PRODUITS (search_products)
// ============================================================

const SEARCH_TESTS = {
  by_name: [
    "Cherche Ledger",
    "Trouve MetaMask",
    "Montre-moi les produits Binance",
  ],

  by_type: [
    "Quels sont les hardware wallets disponibles?",
    "Liste les exchanges centralisés",
    "Montre-moi les protocoles DeFi de lending",
  ],

  by_score: [
    "Quels produits ont un score supérieur à 80?",
    "Les wallets les plus sécurisés",
    "Top 5 par score SAFE",
  ],
};

// ============================================================
// 5. TESTS COMPARAISON (compare_products)
// ============================================================

const COMPARISON_TESTS = {
  two_products: [
    "Compare Ledger Nano X et Trezor Model T",
    "Binance vs Kraken",
    "MetaMask ou Phantom?",
  ],

  multiple_products: [
    "Compare Ledger, Trezor et Coldcard",
    "Quel est le meilleur entre Uniswap, Aave et Compound?",
  ],

  by_category: [
    "Compare les meilleurs hardware wallets",
    "Quel DEX choisir entre Uniswap et SushiSwap?",
  ],
};

// ============================================================
// 6. TESTS SCORE DÉTAILLÉ (get_product_score)
// ============================================================

const SCORE_TESTS = {
  full_analysis: [
    "Donne-moi le score de Ledger Nano X",
    "Analyse complète de Trezor Model T",
    "Évalue MetaMask",
  ],

  pillar_specific: [
    "Comment est la sécurité de Binance?",
    "Quelle est la note d'adversité de Coinbase?",
    "Montre le score de fidélité d'Aave",
  ],
};

// ============================================================
// 7. TESTS NAVIGATION (navigate_to_page)
// ============================================================

const NAVIGATION_TESTS = {
  pages: [
    "Montre-moi le leaderboard",
    "Va sur la page des produits",
    "Ouvre mon dashboard",
    "Voir la méthodologie SAFE",
    "Page de comparaison",
  ],

  product_pages: [
    "Ouvre la page de Ledger Nano X",
    "Voir le détail de Trezor",
  ],
};

// ============================================================
// 8. TESTS UPSELL
// ============================================================

const UPSELL_TESTS = {
  triggers: [
    // Comparison sans accès -> Upsell Explorer
    "Compare 5 wallets différents",

    // Export PDF -> Upsell Explorer
    "Je veux télécharger le rapport en PDF",

    // API access -> Upsell Professional
    "Comment utiliser l'API SafeScoring?",

    // Multiple setups (free) -> Upsell
    "Je veux créer un 2ème setup", // (si déjà 1 en Free)
  ],

  expected_responses: {
    comparison: "Cette fonctionnalité est disponible avec Explorer ($19/mois)",
    pdf_export: "L'export PDF est inclus dans Explorer ($19/mois)",
    api_access: "L'API est disponible avec Professional ($49/mois)",
    setup_limit: "Passez à Explorer pour 5 setups ou Professional pour 20",
  },
};

// ============================================================
// SCRIPT DE TEST AUTOMATIQUE
// ============================================================

async function runTests() {
  console.log("🧪 Tests du chatbot SafeBot\n");

  // Simuler les appels API
  const testCases = [
    // Setup management
    { prompt: "Crée un setup 'Test Portfolio'", expectedTool: "manage_user_setup", expectedAction: "create" },
    { prompt: "Ajoute Ledger Nano X à mon setup", expectedTool: "manage_user_setup", expectedAction: "add_product" },
    { prompt: "Retire MetaMask de mon setup", expectedTool: "manage_user_setup", expectedAction: "remove_product" },

    // Search
    { prompt: "Cherche les hardware wallets", expectedTool: "search_products" },
    { prompt: "Top 5 exchanges", expectedTool: "get_best_by_type" },

    // Score
    { prompt: "Score de Ledger Nano X", expectedTool: "get_product_score" },

    // Compare
    { prompt: "Compare Ledger et Trezor", expectedTool: "compare_products" },

    // Navigation
    { prompt: "Va sur le leaderboard", expectedTool: "navigate_to_page" },
  ];

  console.log("📋 Test cases à exécuter manuellement:\n");
  testCases.forEach((tc, i) => {
    console.log(`${i + 1}. "${tc.prompt}"`);
    console.log(`   → Attendu: ${tc.expectedTool}${tc.expectedAction ? ` (action: ${tc.expectedAction})` : ""}\n`);
  });

  console.log("\n✅ Vérifications visuelles:\n");
  console.log("1. FreemiumLimitIndicator: Doit afficher 'X/10 messages' pour Free");
  console.log("2. QuickActionSuggestions: 4 suggestions au démarrage de la conversation");
  console.log("3. Pricing sur landing page: Section visible entre Products et FAQ");
  console.log("4. SafeBot AI limits dans Pricing: Visible pour chaque plan");
}

// Export pour tests
module.exports = {
  SETUP_TESTS,
  FREEMIUM_TESTS,
  SUGGESTION_TESTS,
  SEARCH_TESTS,
  COMPARISON_TESTS,
  SCORE_TESTS,
  NAVIGATION_TESTS,
  UPSELL_TESTS,
  runTests,
};
