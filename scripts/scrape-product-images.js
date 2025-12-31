/**
 * Script pour scraper automatiquement les images de tous les produits
 * Usage: node scripts/scrape-product-images.js
 *
 * Prérequis:
 * 1. Exécuter la migration SQL: ALTER TABLE products ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
 * 2. Avoir les variables d'environnement NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variables Supabase manquantes");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scrapeImages(url) {
  try {
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(microlinkUrl);
    const data = await response.json();

    if (data.status !== "success") {
      return [];
    }

    const images = [];

    // Image OG principale
    if (data.data?.image?.url) {
      images.push({
        url: data.data.image.url,
        type: "image",
        caption: "Product image",
      });
    }

    return images;
  } catch (error) {
    console.error(`  ⚠️ Erreur scraping: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log("🚀 Démarrage du scraping des images produits...\n");

  // Récupérer tous les produits avec leur URL
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, url")
    .not("url", "is", null)
    .order("name");

  if (error) {
    console.error("❌ Erreur récupération produits:", error.message);
    process.exit(1);
  }

  console.log(`📦 ${products.length} produits trouvés avec URL\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of products) {
    process.stdout.write(`Processing: ${product.name}...`);

    if (!product.url) {
      console.log(" ⏭️ Pas d'URL");
      skipped++;
      continue;
    }

    const images = await scrapeImages(product.url);

    if (images.length === 0) {
      console.log(" ❌ Aucune image trouvée");
      failed++;
      continue;
    }

    // Mettre à jour le produit avec les images
    const { error: updateError } = await supabase
      .from("products")
      .update({ media: images })
      .eq("id", product.id);

    if (updateError) {
      console.log(` ❌ Erreur update: ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(` ✅ ${images.length} image(s)`);
    updated++;

    // Petite pause pour ne pas surcharger l'API
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Mis à jour: ${updated}`);
  console.log(`⏭️ Ignorés: ${skipped}`);
  console.log(`❌ Échecs: ${failed}`);
  console.log("=".repeat(50));
}

main().catch(console.error);
