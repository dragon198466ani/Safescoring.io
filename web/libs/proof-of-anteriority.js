/**
 * Proof of Anteriority System
 *
 * Creates cryptographic proofs that SafeScoring published evaluations
 * BEFORE events occurred. AI cannot forge blockchain timestamps.
 *
 * AI-PROOF because:
 * 1. Blockchain timestamps are immutable
 * 2. Hash commitments prove what we knew and when
 * 3. Cannot retroactively create proofs
 */

import crypto from "crypto";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet, polygon } from "viem/chains";

// Contract addresses (deploy SafeScoreRegistry to these networks)
const REGISTRY_ADDRESSES = {
  mainnet: process.env.REGISTRY_ADDRESS_MAINNET,
  polygon: process.env.REGISTRY_ADDRESS_POLYGON,
};

/**
 * Generate commitment hash for an evaluation
 * This hash can be published on-chain BEFORE revealing the full evaluation
 */
export function generateEvaluationCommitment(evaluation) {
  const {
    productId,
    productName,
    safeScore,
    pillarScores, // { S, A, F, E }
    evaluatedNorms,
    methodology,
    timestamp,
  } = evaluation;

  // Create deterministic JSON representation
  const commitmentData = JSON.stringify({
    p: productId,
    n: productName,
    s: Math.round(safeScore * 100), // Integer to avoid float issues
    pillars: {
      S: Math.round(pillarScores.S * 100),
      A: Math.round(pillarScores.A * 100),
      F: Math.round(pillarScores.F * 100),
      E: Math.round(pillarScores.E * 100),
    },
    norms: evaluatedNorms.length,
    m: methodology,
    t: timestamp,
  });

  // Generate commitment hash
  const commitmentHash = crypto
    .createHash("sha256")
    .update(commitmentData)
    .digest("hex");

  return {
    hash: `0x${commitmentHash}`,
    data: commitmentData,
    timestamp,
  };
}

/**
 * Generate prediction commitment
 * "We predict product X will have incident within Y days based on score Z"
 */
export function generatePredictionCommitment(prediction) {
  const {
    productId,
    productName,
    currentScore,
    riskLevel, // 'low', 'medium', 'high', 'critical'
    predictionWindow, // Days
    predictionType, // 'incident', 'score_change', 'vulnerability'
    confidence,
    timestamp,
  } = prediction;

  const commitmentData = JSON.stringify({
    type: "prediction",
    product: { id: productId, name: productName },
    score: Math.round(currentScore * 100),
    risk: riskLevel,
    window: predictionWindow,
    predType: predictionType,
    conf: Math.round(confidence * 100),
    t: timestamp,
    version: "1.0",
  });

  const commitmentHash = crypto
    .createHash("sha256")
    .update(commitmentData)
    .digest("hex");

  return {
    hash: `0x${commitmentHash}`,
    data: commitmentData,
    timestamp,
    // For verification later
    verification: {
      productId,
      riskLevel,
      predictionWindow,
      expiresAt: timestamp + predictionWindow * 24 * 60 * 60 * 1000,
    },
  };
}

/**
 * Create methodology commitment
 * Proves our norm definitions existed at a specific time
 */
export function generateMethodologyCommitment(norms) {
  const timestamp = Date.now();

  // Create merkle root of all norm definitions
  const normHashes = norms.map((norm) => {
    return crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          id: norm.norm_id,
          pillar: norm.pillar,
          code: norm.norm_code,
          definition: norm.definition,
          applicability: norm.applicability_rules,
        })
      )
      .digest("hex");
  });

  // Simple merkle root (for production, use a proper merkle tree)
  const merkleRoot = crypto
    .createHash("sha256")
    .update(normHashes.join(""))
    .digest("hex");

  return {
    merkleRoot: `0x${merkleRoot}`,
    normCount: norms.length,
    timestamp,
    version: "SAFE-v2.0",
    // Store individual hashes for proof generation
    normHashes: normHashes.map((h, i) => ({
      normId: norms[i].norm_id,
      hash: `0x${h}`,
    })),
  };
}

/**
 * Verify a commitment against revealed data
 */
export function verifyCommitment(commitmentHash, revealedData) {
  const recalculatedHash = crypto
    .createHash("sha256")
    .update(revealedData)
    .digest("hex");

  return `0x${recalculatedHash}` === commitmentHash;
}

/**
 * Create proof of anteriority document
 * This document can be used in legal proceedings
 */
export function createAnteriorityProof(commitment, blockchainTx) {
  return {
    // What was committed
    commitment: {
      hash: commitment.hash,
      timestamp: commitment.timestamp,
      dataHash: crypto.createHash("sha256").update(commitment.data).digest("hex"),
    },

    // Blockchain proof
    blockchain: {
      network: blockchainTx.network,
      transactionHash: blockchainTx.hash,
      blockNumber: blockchainTx.blockNumber,
      blockTimestamp: blockchainTx.timestamp,
      contractAddress: blockchainTx.contractAddress,
    },

    // Verification instructions
    verification: {
      steps: [
        "1. Retrieve transaction from blockchain using transactionHash",
        "2. Verify blockTimestamp matches claimed time",
        "3. Decode transaction data to extract commitment hash",
        "4. Compare commitment hash with hash in this document",
        "5. To verify content: hash the revealed data with SHA-256",
        "6. Compare resulting hash with commitment hash",
      ],
      explorerLinks: {
        mainnet: `https://etherscan.io/tx/${blockchainTx.hash}`,
        polygon: `https://polygonscan.com/tx/${blockchainTx.hash}`,
      },
    },

    // Legal attestation
    attestation: {
      generatedAt: new Date().toISOString(),
      generatedBy: "SafeScoring Proof System v1.0",
      disclaimer:
        "This proof demonstrates that the commitment hash existed on the blockchain at the specified time. The full data was revealed after the commitment was made.",
    },
  };
}

/**
 * Batch publish commitments to blockchain (gas efficient)
 */
export async function publishCommitmentsBatch(commitments, network = "polygon") {
  // This would interact with the SafeScoreRegistry contract
  // Using the publishScoresBatch function

  const batchData = commitments.map((c) => ({
    productId: c.productId,
    hash: c.hash,
  }));

  // Return transaction data for signing
  return {
    network,
    contractAddress: REGISTRY_ADDRESSES[network],
    method: "publishScoresBatch",
    data: batchData,
    estimatedGas: batchData.length * 50000, // ~50k gas per commitment
  };
}

/**
 * Weekly commitment ceremony
 * Publishes merkle root of all evaluations for the week
 */
export function generateWeeklyCommitment(weeklyData) {
  const {
    weekNumber,
    year,
    evaluations,
    incidents,
    corrections,
    newProducts,
  } = weeklyData;

  const weekId = `${year}-W${weekNumber.toString().padStart(2, "0")}`;

  // Generate merkle roots for each category
  const evaluationRoot = generateMerkleRoot(evaluations);
  const incidentRoot = generateMerkleRoot(incidents);
  const correctionRoot = generateMerkleRoot(corrections);
  const productRoot = generateMerkleRoot(newProducts);

  // Combine into weekly root
  const weeklyRoot = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        week: weekId,
        roots: {
          evaluations: evaluationRoot,
          incidents: incidentRoot,
          corrections: correctionRoot,
          products: productRoot,
        },
        counts: {
          evaluations: evaluations.length,
          incidents: incidents.length,
          corrections: corrections.length,
          products: newProducts.length,
        },
      })
    )
    .digest("hex");

  return {
    weekId,
    weeklyRoot: `0x${weeklyRoot}`,
    subRoots: {
      evaluations: evaluationRoot,
      incidents: incidentRoot,
      corrections: correctionRoot,
      products: productRoot,
    },
    counts: {
      evaluations: evaluations.length,
      incidents: incidents.length,
      corrections: corrections.length,
      products: newProducts.length,
    },
    timestamp: Date.now(),
  };
}

// Helper: Generate simple merkle root
function generateMerkleRoot(items) {
  if (items.length === 0) return "0x" + "0".repeat(64);

  const hashes = items.map((item) =>
    crypto.createHash("sha256").update(JSON.stringify(item)).digest("hex")
  );

  // Simplified merkle root (combine all hashes)
  return (
    "0x" +
    crypto.createHash("sha256").update(hashes.sort().join("")).digest("hex")
  );
}

/**
 * API endpoint helper: Generate proof for public verification
 */
export function generatePublicProof(productId, score, timestamp, txHash) {
  return {
    product_id: productId,
    safe_score: score,
    proof: {
      type: "blockchain_commitment",
      network: "polygon",
      transaction: txHash,
      timestamp: timestamp,
      verification_url: `https://polygonscan.com/tx/${txHash}`,
    },
    verification_instructions: {
      en: "Verify this score by checking the blockchain transaction. The evaluation hash in the transaction matches SHA-256 of our published evaluation data.",
      fr: "Vérifiez ce score en consultant la transaction blockchain. Le hash d'évaluation dans la transaction correspond au SHA-256 de nos données d'évaluation publiées.",
    },
  };
}
