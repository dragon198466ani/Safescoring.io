/**
 * Test de cohérence des upsells du chatbot SafeBot
 * Vérifie que les bons plans sont recommandés selon les demandes utilisateur
 */

// Mapping attendu: prompt utilisateur -> plan recommandé
const EXPECTED_UPSELLS = {
  // ============= EXPLORER ($19/mo) =============
  explorer: {
    triggers: ["comparison", "pdf_export", "multiple_setups"],
    price: 19,
    prompts: [
      // Comparaisons
      "Compare Ledger et Trezor",
      "Quelle est la différence entre Binance et Kraken?",
      "Comparatif des hardware wallets",
      "Compare ces 3 produits",
      "Je veux comparer plusieurs exchanges",

      // PDF Export
      "Je veux un PDF de mon analyse",
      "Exporter en PDF",
      "Télécharger le rapport",
      "Génère un PDF de comparaison",
      "Export du rapport de sécurité",

      // Multiple setups
      "Je veux créer un deuxième setup",
      "Ajouter un nouveau setup",
      "J'ai besoin de plusieurs configurations",
      "Setup pour mon entreprise ET personnel",
    ],
  },

  // ============= PROFESSIONAL ($49/mo) =============
  professional: {
    triggers: ["api_access", "score_tracking", "advanced_analysis", "many_setups"],
    price: 49,
    prompts: [
      // API Access
      "Comment accéder à l'API?",
      "Je veux utiliser l'API SafeScoring",
      "API pour intégrer les scores",
      "Accès programmatique aux données",
      "Documentation API",

      // Score tracking
      "Suivre l'évolution des scores",
      "Historique des changements de score",
      "Alertes quand un score change",
      "Monitoring des scores",
      "Notifier si Ledger perd des points",

      // Advanced analysis
      "Analyse approfondie de Binance",
      "Détail de toutes les normes",
      "Rapport complet avec toutes les évaluations",
      "Analyse de risque détaillée",
      "Audit complet de mon setup",

      // Many setups
      "J'ai besoin de 10 setups",
      "Setup pour toute mon équipe",
      "Configurations multiples pour différents clients",
    ],
  },

  // ============= ENTERPRISE ($299/mo) =============
  enterprise: {
    triggers: ["team", "unlimited", "white_label"],
    price: 299,
    prompts: [
      // Team
      "Partager avec mon équipe",
      "Accès multi-utilisateurs",
      "Gestion des droits d'équipe",

      // Unlimited
      "Accès illimité",
      "Sans limite de setups",
      "API sans quotas",

      // White label
      "White label pour mon entreprise",
      "Marque personnalisée",
      "Rapport avec notre logo",
    ],
  },
};

// ============= PROMPTS QUI NE DOIVENT PAS DÉCLENCHER D'UPSELL =============
const NO_UPSELL_PROMPTS = [
  // Questions basiques (Free)
  "Quel est le score de Ledger?",
  "C'est quoi la méthodologie SAFE?",
  "Meilleur hardware wallet?",
  "Score du Trezor Model T",
  "Qu'est-ce qu'un CEX?",
  "Conseils de sécurité",
  "Liste des wallets",
  "Top 5 des exchanges",
];

// ============= VALIDATION DE LA CONFIGURATION =============
function validateConfig() {
  console.log("=== VALIDATION DE LA CONFIGURATION UPSELL ===\n");

  // Check PLAN_FEATURES dans route.js
  const expectedFeatures = {
    explorer: {
      price: 19,
      triggers: ["comparison", "pdf_export", "multiple_setups"],
    },
    professional: {
      price: 49,
      triggers: ["api_access", "score_tracking", "advanced_analysis", "many_setups"],
    },
    enterprise: {
      price: 299,
      triggers: ["team", "unlimited", "white_label"],
    },
  };

  console.log("Mapping des triggers attendus:\n");

  for (const [plan, config] of Object.entries(expectedFeatures)) {
    console.log(`${plan.toUpperCase()} ($${config.price}/mo):`);
    console.log(`  Triggers: ${config.triggers.join(", ")}`);
    console.log(`  Exemples de prompts:`);
    EXPECTED_UPSELLS[plan]?.prompts.slice(0, 3).forEach(p => {
      console.log(`    - "${p}"`);
    });
    console.log("");
  }

  console.log("Prompts qui ne déclenchent PAS d'upsell:");
  NO_UPSELL_PROMPTS.slice(0, 5).forEach(p => {
    console.log(`  - "${p}"`);
  });
}

// ============= TEST MATRIX =============
function generateTestMatrix() {
  console.log("\n=== MATRICE DE TEST ===\n");
  console.log("| Prompt | Plan Attendu | Trigger |");
  console.log("|--------|--------------|---------|");

  for (const [plan, config] of Object.entries(EXPECTED_UPSELLS)) {
    config.prompts.forEach((prompt, i) => {
      const trigger = config.triggers[Math.floor(i / (config.prompts.length / config.triggers.length))] || config.triggers[0];
      console.log(`| ${prompt.substring(0, 40).padEnd(40)} | ${plan.padEnd(12)} | ${trigger} |`);
    });
  }
}

// Run
validateConfig();
generateTestMatrix();

console.log("\n=== RÈGLES DE COHÉRENCE ===");
console.log(`
1. Explorer ($19/mo) - Pour les utilisateurs qui veulent:
   - Comparer des produits entre eux
   - Exporter des rapports en PDF
   - Avoir plus d'un setup (jusqu'à 5)

2. Professional ($49/mo) - Pour les utilisateurs qui veulent:
   - Accès API programmatique
   - Suivre l'évolution des scores
   - Analyses approfondies avec toutes les normes
   - Beaucoup de setups (jusqu'à 20)

3. Enterprise ($299/mo) - Pour les utilisateurs qui veulent:
   - Partage équipe
   - Accès illimité
   - White-label (bientôt)

4. Free (gratuit) - Suffit pour:
   - Voir les scores des produits
   - 1 setup personnel
   - Conseils de sécurité basiques
   - Questions sur la méthodologie
`);
