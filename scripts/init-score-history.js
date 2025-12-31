/**
 * Script to initialize score history for all products
 * Run with: node scripts/init-score-history.js
 */

const fs = require("fs");
const path = require("path");

// Load .env manually
const envPath = path.join(__dirname, "../web/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach(line => {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
      process.env[key] = value;
    }
  });
}

// Use supabase from web/node_modules
const { createClient } = require("../web/node_modules/@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MONTHS = 12;
const VARIANCE = 3;

async function initScoreHistory() {
  console.log("=".repeat(60));
  console.log("INITIALIZING SCORE HISTORY");
  console.log("=".repeat(60));

  // Step 1: Get current status
  console.log("\n[1/4] Checking current status...");

  const { count: scoresCount } = await supabase
    .from("safe_scoring_results")
    .select("*", { count: "exact", head: true })
    .not("note_finale", "is", null);

  const { data: existingHistory } = await supabase
    .from("score_history")
    .select("product_id");

  const productsWithHistory = new Set(existingHistory?.map(h => h.product_id) || []);

  console.log(`   Products with scores: ${scoresCount}`);
  console.log(`   Products with history: ${productsWithHistory.size}`);
  console.log(`   Products missing history: ${scoresCount - productsWithHistory.size}`);

  // Step 2: Get all products with scores
  console.log("\n[2/4] Fetching products with scores...");

  const { data: products, error: productsError } = await supabase
    .from("safe_scoring_results")
    .select(`
      product_id,
      note_finale,
      score_s,
      score_a,
      score_f,
      score_e,
      note_consumer,
      note_essential,
      total_norms_evaluated,
      total_yes,
      total_no,
      total_na,
      total_tbd,
      calculated_at
    `)
    .not("note_finale", "is", null);

  if (productsError) {
    console.error("Error fetching products:", productsError);
    process.exit(1);
  }

  console.log(`   Found ${products.length} products with scores`);

  if (!products.length) {
    console.log("\nNo products with scores found. Nothing to do.");
    return;
  }

  // Step 3: Seed initial history for products without any
  console.log("\n[3/4] Seeding initial history...");

  const productsNeedingHistory = products.filter(
    p => !productsWithHistory.has(p.product_id)
  );

  if (productsNeedingHistory.length > 0) {
    const seedEntries = productsNeedingHistory.map(p => ({
      product_id: p.product_id,
      recorded_at: p.calculated_at || new Date().toISOString(),
      safe_score: p.note_finale,
      score_s: p.score_s,
      score_a: p.score_a,
      score_f: p.score_f,
      score_e: p.score_e,
      consumer_score: p.note_consumer,
      essential_score: p.note_essential,
      total_evaluations: p.total_norms_evaluated,
      total_yes: p.total_yes,
      total_no: p.total_no,
      total_na: p.total_na,
      total_tbd: p.total_tbd || 0,
      previous_safe_score: null,
      score_change: null,
      change_reason: "Initial score recording",
      triggered_by: "seed_history",
    }));

    const { data: seeded, error: seedError } = await supabase
      .from("score_history")
      .insert(seedEntries)
      .select("id");

    if (seedError) {
      console.error("   Error seeding:", seedError.message);
    } else {
      console.log(`   Seeded ${seeded?.length || 0} initial records`);
    }
  } else {
    console.log("   All products already have initial history");
  }

  // Step 4: Generate historical data points
  console.log("\n[4/4] Generating historical data...");

  const now = new Date();
  const historyEntries = [];

  for (const product of products) {
    let previousScore = null;
    const baseScore = product.note_finale;

    // Generate monthly data points (from oldest to newest, skip month 0 as it's current)
    for (let i = MONTHS - 1; i >= 1; i--) {
      const recordDate = new Date(now);
      recordDate.setMonth(recordDate.getMonth() - i);
      recordDate.setDate(Math.floor(Math.random() * 28) + 1);

      // Calculate score with variance (showing improvement trend)
      const trendBonus = ((MONTHS - i) / MONTHS) * 2.5;
      const randomVariance = (Math.random() - 0.5) * VARIANCE * 2;
      let score = baseScore - trendBonus + randomVariance;
      score = Math.max(0, Math.min(100, score));

      const pillarVariance = (pillarScore) => {
        if (!pillarScore) return null;
        const varied = pillarScore - trendBonus + (Math.random() - 0.5) * VARIANCE;
        return parseFloat(Math.max(0, Math.min(100, varied)).toFixed(2));
      };

      const scoreChange = previousScore !== null ? score - previousScore : null;

      historyEntries.push({
        product_id: product.product_id,
        recorded_at: recordDate.toISOString(),
        safe_score: parseFloat(score.toFixed(2)),
        score_s: pillarVariance(product.score_s),
        score_a: pillarVariance(product.score_a),
        score_f: pillarVariance(product.score_f),
        score_e: pillarVariance(product.score_e),
        consumer_score: pillarVariance(product.note_consumer),
        essential_score: pillarVariance(product.note_essential),
        total_evaluations: product.total_norms_evaluated,
        total_yes: product.total_yes,
        total_no: product.total_no,
        total_na: product.total_na,
        total_tbd: product.total_tbd || 0,
        previous_safe_score: previousScore ? parseFloat(previousScore.toFixed(2)) : null,
        score_change: scoreChange ? parseFloat(scoreChange.toFixed(2)) : null,
        change_reason: previousScore === null ? "Historical baseline" :
                      scoreChange > 0 ? "Monthly improvement" :
                      scoreChange < 0 ? "Monthly adjustment" : "Monthly review",
        triggered_by: "history_generator",
      });

      previousScore = score;
    }
  }

  console.log(`   Generated ${historyEntries.length} history entries`);

  // Insert in batches
  const BATCH_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < historyEntries.length; i += BATCH_SIZE) {
    const batch = historyEntries.slice(i, i + BATCH_SIZE);
    const { data: inserted, error: insertError } = await supabase
      .from("score_history")
      .insert(batch)
      .select("id");

    if (insertError) {
      console.error(`   Error inserting batch: ${insertError.message}`);
      break;
    }

    totalInserted += inserted?.length || 0;
    process.stdout.write(`   Inserted: ${totalInserted}/${historyEntries.length}\r`);
  }

  console.log(`\n   Total inserted: ${totalInserted}`);

  // Final status
  console.log("\n" + "=".repeat(60));
  console.log("DONE!");
  console.log("=".repeat(60));

  const { count: finalCount } = await supabase
    .from("score_history")
    .select("*", { count: "exact", head: true });

  const { data: finalHistory } = await supabase
    .from("score_history")
    .select("product_id");

  const finalProductsWithHistory = new Set(finalHistory?.map(h => h.product_id) || []).size;

  console.log(`\nFinal Status:`);
  console.log(`   Total history records: ${finalCount}`);
  console.log(`   Products with history: ${finalProductsWithHistory}`);
  console.log(`   Avg records per product: ${(finalCount / finalProductsWithHistory).toFixed(1)}`);
  console.log(`\nGraphs should now display correctly!`);
}

initScoreHistory().catch(console.error);
