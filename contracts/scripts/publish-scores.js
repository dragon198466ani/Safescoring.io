/**
 * Publish SAFE Scores to On-Chain Registry
 *
 * Usage:
 *   npx hardhat run scripts/publish-scores.js --network sepolia
 *
 * This script:
 * 1. Fetches latest scores from Supabase
 * 2. Publishes them to the SafeScoreRegistry contract
 * 3. Creates immutable on-chain proof of evaluations
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment info
function getDeployment(network) {
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found for network: ${network}. Run deploy.js first.`);
  }
  return JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
}

// Fetch scores from Supabase
async function fetchScoresFromSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY required");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/safe_scoring_results?select=product_id,note_finale,score_s,score_a,score_f,score_e,calculated_at&order=calculated_at.desc`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch scores: ${response.statusText}`);
  }

  const allScores = await response.json();

  // Get latest score per product
  const latestScores = {};
  for (const score of allScores) {
    if (!latestScores[score.product_id]) {
      latestScores[score.product_id] = score;
    }
  }

  return Object.values(latestScores);
}

// Generate evaluation hash (for IPFS/Arweave reference)
function generateEvaluationHash(productId, scores, timestamp) {
  const data = JSON.stringify({
    productId,
    scores,
    timestamp,
    methodology: "SAFE v2.0",
  });

  // Simple hash for now - in production, upload to IPFS/Arweave and use that hash
  const hash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(data));
  return hash;
}

async function main() {
  console.log("=".repeat(60));
  console.log("SafeScoring - Publish Scores On-Chain");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log(`\nNetwork: ${network}`);

  // Load deployment
  const deployment = getDeployment(network);
  const registryAddress = deployment.contracts.SafeScoreRegistry.address;
  console.log(`Registry: ${registryAddress}`);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`Publisher: ${signer.address}`);

  // Connect to contract
  const registry = await hre.ethers.getContractAt("SafeScoreRegistry", registryAddress, signer);

  // Check ownership
  const owner = await registry.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Signer is not the contract owner. Owner: ${owner}`);
  }

  // Fetch scores
  console.log("\n[*] Fetching scores from Supabase...");
  const scores = await fetchScoresFromSupabase();
  console.log(`Found ${scores.length} products with scores`);

  // Filter products that need publishing
  const toPublish = [];

  for (const score of scores) {
    const productId = BigInt(score.product_id);

    // Check if already published with same score
    try {
      const existingScore = await registry.getScore(productId);
      const existingOverall = Number(existingScore.overall);
      const newOverall = Math.round(score.note_finale || 0);

      if (existingOverall === newOverall) {
        continue; // Skip if score hasn't changed
      }
    } catch {
      // Product not yet on chain, needs publishing
    }

    toPublish.push(score);
  }

  console.log(`${toPublish.length} products need publishing`);

  if (toPublish.length === 0) {
    console.log("\nNo new scores to publish. All scores are up to date.");
    return;
  }

  // Publish scores
  console.log("\n[*] Publishing scores...");

  let published = 0;
  let failed = 0;

  // Batch publish for efficiency
  const batchSize = 10;
  for (let i = 0; i < toPublish.length; i += batchSize) {
    const batch = toPublish.slice(i, i + batchSize);

    const productIds = batch.map(s => BigInt(s.product_id));
    const scoresArray = batch.map(s => [
      Math.round(s.note_finale || 0),
      Math.round(s.score_s || 0),
      Math.round(s.score_a || 0),
      Math.round(s.score_f || 0),
      Math.round(s.score_e || 0),
    ]);
    const hashes = batch.map(s =>
      generateEvaluationHash(s.product_id, s, s.calculated_at)
    );

    try {
      console.log(`\nPublishing batch ${Math.floor(i / batchSize) + 1}...`);

      const tx = await registry.publishScoresBatch(productIds, scoresArray, hashes);
      console.log(`TX: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`Confirmed in block ${receipt.blockNumber}`);

      published += batch.length;
    } catch (error) {
      console.error(`Batch failed:`, error.message);
      failed += batch.length;
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("PUBLISHING SUMMARY");
  console.log("=".repeat(60));
  console.log(`Published:  ${published} products`);
  console.log(`Failed:     ${failed} products`);
  console.log(`Total:      ${await registry.totalProducts()} products on-chain`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
