/**
 * Script pour générer automatiquement les descriptions de tous les produits via Mistral API
 * Usage: node scripts/generate-product-descriptions.js
 *
 * Prérequis:
 * 1. Avoir les variables d'environnement NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et MISTRAL_API_KEY
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: "../config/.env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mistralKey = process.env.MISTRAL_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables Supabase manquantes");
  process.exit(1);
}

if (!mistralKey) {
  console.error("❌ MISTRAL_API_KEY manquante");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Clean AI-generated description: remove unwanted patterns
function cleanDescription(text) {
  if (!text) return null;
  let cleaned = text;
  // Remove "(XX characters)" pattern that AI sometimes adds
  cleaned = cleaned.replace(/\s*\(\d+\s*characters?\)\s*$/i, '');
  // Remove surrounding quotes
  cleaned = cleaned.replace(/^"+|"+$/g, '');
  cleaned = cleaned.replace(/^'+|'+$/g, '');
  return cleaned.trim();
}

async function generateDescription(product, productType) {
  const prompt = `Generate a concise, professional description (2-3 sentences, max 200 characters) for this crypto product:

Product Name: ${product.name}
Product Type: ${productType || "crypto product"}

The description should:
- Be factual and informative
- Highlight the main purpose/function of the product
- Be written in a neutral, professional tone
- NOT include marketing hype or unverified claims
- NOT include any website URL or link

Respond with ONLY the description, nothing else.`;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error(`  ⚠️ Mistral Error: ${data.error.message}`);
      return null;
    }

    const rawDescription = data.choices?.[0]?.message?.content?.trim() || null;
    return cleanDescription(rawDescription);
  } catch (error) {
    console.error(`  ⚠️ Erreur Mistral: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("🚀 Démarrage de la génération des descriptions...\n");

  // Récupérer tous les produits sans description
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      url,
      description,
      product_types (name)
    `)
    // Régénérer toutes les descriptions
    .order("name");

  if (error) {
    console.error("❌ Erreur récupération produits:", error.message);
    process.exit(1);
  }

  console.log(`📦 ${products.length} produits sans description trouvés\n`);

  if (products.length === 0) {
    console.log("✅ Tous les produits ont déjà une description!");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const product of products) {
    process.stdout.write(`Processing: ${product.name}...`);

    const productType = product.product_types?.name;
    const description = await generateDescription(product, productType);

    if (!description) {
      console.log(" ❌ Échec génération");
      failed++;
      continue;
    }

    // Mettre à jour le produit avec la description
    const { error: updateError } = await supabase
      .from("products")
      .update({ description })
      .eq("id", product.id);

    if (updateError) {
      console.log(` ❌ Erreur update: ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(` ✅ OK`);
    console.log(`   → "${description.substring(0, 80)}..."`);
    updated++;

    // Pause pour respecter les rate limits OpenAI
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Mis à jour: ${updated}`);
  console.log(`❌ Échecs: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
