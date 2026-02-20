/**
 * EXEMPLE: Comment intégrer l'IA locale dans /api/corrections
 *
 * Ce fichier montre comment ajouter la validation IA locale
 * à la route de corrections existante.
 *
 * COPIER les sections marquées "// === IA LOCALE ===" dans route.js
 */

import { NextResponse } from "next/server";
import { validateInput, classifyText } from "@/libs/local-ai";

// === IA LOCALE: Import à ajouter en haut du fichier ===
// import { validateInput, classifyText } from "@/libs/local-ai";

/**
 * Exemple de validation de la raison de correction avec IA locale
 *
 * Ajouter APRÈS la validation de longueur (ligne ~86)
 */
async function validateCorrectionWithAI(correctionReason, suggestedValue) {
  // Skip si pas de raison fournie
  if (!correctionReason || correctionReason.length < 10) {
    return { valid: true }; // Laisser passer les corrections simples
  }

  // === IA LOCALE: Valider la qualité de la raison ===
  const validation = await validateInput(correctionReason, "correction reason for a security product");

  if (validation && !validation.valid) {
    return {
      valid: false,
      error: `Correction reason rejected: ${validation.reason}`,
      aiRejected: true
    };
  }

  // === IA LOCALE: Classifier le type de correction ===
  const correctionType = await classifyText(correctionReason, [
    "typo",           // Simple faute de frappe
    "data_update",    // Mise à jour de données
    "methodology",    // Erreur de méthodologie
    "security_issue", // Problème de sécurité
    "feature_change", // Changement de fonctionnalité
    "other"
  ]);

  return {
    valid: true,
    correctionType: correctionType || "other"
  };
}

/**
 * EXEMPLE D'UTILISATION dans la fonction POST
 */
export async function POST_EXAMPLE(request) {
  // ... code existant de validation ...

  const { correctionReason, suggestedValue } = body;

  // === IA LOCALE: Ajouter après ligne 91 ===
  if (correctionReason) {
    const aiValidation = await validateCorrectionWithAI(correctionReason, suggestedValue);

    if (!aiValidation.valid) {
      return NextResponse.json(
        {
          error: aiValidation.error,
          suggestion: "Please provide a more detailed and specific correction reason."
        },
        { status: 400 }
      );
    }

    // Ajouter le type de correction aux données (optionnel)
    // body.correctionType = aiValidation.correctionType;
  }

  // ... reste du code existant ...
}

/**
 * AUTRE EXEMPLE: Validation d'email avec IA locale
 * Pour /api/lead ou /api/newsletter
 */
import { quickAnswer } from "@/libs/local-ai";

async function validateEmailDomain(email) {
  const domain = email.split('@')[1];

  // Domaines connus - pas besoin d'IA
  const trustedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com'];
  if (trustedDomains.includes(domain)) {
    return { trusted: true };
  }

  // === IA LOCALE: Vérifier les domaines inconnus ===
  const isTrusted = await quickAnswer(
    `Is "${domain}" a legitimate email domain for a professional user? Consider if it's a known company, university, or reputable email provider.`
  );

  return {
    trusted: isTrusted !== false, // null = pas d'IA = laisser passer
    checkedByAI: isTrusted !== null
  };
}

/**
 * EXEMPLE: Classification de recherche
 * Pour /api/search
 */
async function classifySearchIntent(query) {
  const intent = await classifyText(query, [
    "product_search",    // Cherche un produit spécifique
    "category_browse",   // Explore une catégorie
    "comparison",        // Compare des produits
    "security_question", // Question sur la sécurité
    "support"            // Besoin d'aide
  ]);

  return intent || "product_search";
}

/**
 * PERFORMANCE TIPS:
 *
 * 1. L'IA locale prend ~2-3s après warmup
 * 2. Ne pas utiliser pour chaque requête - seulement quand nécessaire
 * 3. Toujours avoir un fallback si Ollama n'est pas disponible
 * 4. Les fonctions retournent null si Ollama indisponible
 * 5. Utiliser pour validations non-critiques uniquement
 */
