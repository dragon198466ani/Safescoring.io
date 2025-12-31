/**
 * Script pour corriger les descriptions de produits
 * - Supprime "(XX characters)" a la fin
 * - Supprime les guillemets doubles superflus au debut/fin
 * Usage: node scripts/fix-product-descriptions.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: "../config/.env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Variables Supabase manquantes");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Clean description: remove char count and extra quotes
function cleanDescription(text) {
  if (!text) return null;

  let cleaned = text;

  // Remove "(XX characters)" pattern
  cleaned = cleaned.replace(/\s*\(\d+\s*characters?\)\s*$/i, '');

  // Remove surrounding double quotes (""text"" -> text)
  cleaned = cleaned.replace(/^"+|"+$/g, '');

  // Remove surrounding single quotes if any
  cleaned = cleaned.replace(/^'+|'+$/g, '');

  return cleaned.trim();
}

// Check if description needs cleaning
function needsCleaning(text) {
  if (!text) return false;

  // Check for char count pattern
  if (/\s*\(\d+\s*characters?\)\s*$/i.test(text)) return true;

  // Check for surrounding quotes
  if (/^".*"$/.test(text) || /^'.*'$/.test(text)) return true;

  return false;
}

async function main() {
  console.log("Recherche des descriptions a nettoyer...\n");

  // Fetch all products with descriptions
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, description, short_description")
    .order("name");

  if (error) {
    console.error("Erreur:", error.message);
    process.exit(1);
  }

  console.log(`${products.length} produits trouves\n`);

  let problemsFound = 0;
  let fixed = 0;

  for (const product of products) {
    let needsUpdate = false;
    const updates = {};

    // Check description
    if (needsCleaning(product.description)) {
      console.log(`\n[PROBLEM] ${product.name}`);
      console.log(`  Avant: "${product.description}"`);

      const cleanedDescription = cleanDescription(product.description);
      console.log(`  Apres: "${cleanedDescription}"`);

      updates.description = cleanedDescription;
      needsUpdate = true;
      problemsFound++;
    }

    // Check short_description too
    if (needsCleaning(product.short_description)) {
      console.log(`  Short avant: "${product.short_description}"`);

      const cleanedShort = cleanDescription(product.short_description);
      console.log(`  Short apres: "${cleanedShort}"`);

      updates.short_description = cleanedShort;
      needsUpdate = true;
    }

    // Update if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from("products")
        .update(updates)
        .eq("id", product.id);

      if (updateError) {
        console.log(`  ERREUR update: ${updateError.message}`);
      } else {
        console.log(`  CORRIGE!`);
        fixed++;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Problemes trouves: ${problemsFound}`);
  console.log(`Corriges: ${fixed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
