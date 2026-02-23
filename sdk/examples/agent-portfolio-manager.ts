/**
 * Example: AI Agent Portfolio Manager
 *
 * An autonomous agent that checks SafeScoring SAFE scores
 * before interacting with DeFi protocols.
 *
 * Prerequisites:
 *   npm install @safescoring/sdk ethers
 *
 * Run:
 *   AGENT_PRIVATE_KEY=0x... npx tsx agent-portfolio-manager.ts
 */

import { SafeScoring } from "@safescoring/sdk";

const MINIMUM_SCORE = 65; // Don't interact with products scoring below this
const WALLET = "0xYourAgentWalletAddress";
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;

async function main() {
  // Initialize SDK in agent mode (wallet auth, pay-per-query)
  const safe = new SafeScoring({
    walletAddress: WALLET,
    privateKey: PRIVATE_KEY,
  });

  console.log("=== SafeScoring Agent Portfolio Manager ===\n");

  // 1. Check our balance
  const balance = await safe.agent!.getBalance();
  console.log(`Wallet: ${balance.wallet}`);
  console.log(`Balance: $${balance.balance} USDC`);
  console.log(`Total queries: ${balance.totalQueries}\n`);

  if (balance.balance < 0.5) {
    console.log("Low balance! Creating deposit invoice...");
    const deposit = await safe.agent!.deposit(10); // Deposit $10 USDC
    console.log(`Deposit URL: ${deposit.invoiceUrl}\n`);
    return;
  }

  // 2. Define our portfolio targets
  const targets = [
    "aave-v3",
    "compound-v3",
    "uniswap-v3",
    "curve-finance",
    "lido-finance",
  ];

  // 3. Batch query all scores ($0.005 each = $0.025 total)
  console.log(`Batch querying ${targets.length} protocols...`);
  const batch = await safe.agent!.batchScores(targets);

  console.log(`Cost: $${batch.payment.cost} USDC`);
  console.log(`Remaining balance: $${batch.payment.newBalance}\n`);

  // 4. Filter by minimum score
  const safeProtocols = batch.data.filter(
    (p) => p.score !== null && p.score >= MINIMUM_SCORE
  );
  const riskyProtocols = batch.data.filter(
    (p) => p.score !== null && p.score < MINIMUM_SCORE
  );

  console.log("--- SAFE protocols (score >= " + MINIMUM_SCORE + ") ---");
  for (const p of safeProtocols) {
    console.log(
      `  ${p.name}: ${p.score}/100 (S:${p.scores?.s} A:${p.scores?.a} F:${p.scores?.f} E:${p.scores?.e})`
    );
  }

  if (riskyProtocols.length > 0) {
    console.log("\n--- RISKY protocols (SKIPPED) ---");
    for (const p of riskyProtocols) {
      console.log(`  ${p.name}: ${p.score}/100 - BLOCKED`);
    }
  }

  // 5. Deep analysis on the best candidate ($0.10)
  if (safeProtocols.length > 0) {
    const best = safeProtocols.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    console.log(`\nDeep analysis on ${best.name}...`);

    const analysis = await safe.agent!.getAnalysis(best.slug);
    const risk = analysis.data.analysis.riskAssessment;

    console.log(`  Risk level: ${risk.level}`);
    console.log(`  Failure rate: ${risk.failRate}%`);
    console.log(`  Critical failures: ${risk.criticalFailures}`);
    console.log(`  Weakest pillar: ${risk.weakestPillar}`);
    console.log(`  Incidents: ${analysis.data.incidents.length}`);
    console.log(`  Cost: $${analysis.payment.cost} USDC`);
    console.log(`  Balance: $${analysis.payment.newBalance}\n`);

    if (risk.level === "low" || risk.level === "medium") {
      console.log(`DECISION: Proceed with ${best.name} (score: ${best.score}, risk: ${risk.level})`);
    } else {
      console.log(`DECISION: Skip ${best.name} due to ${risk.level} risk`);
    }
  }

  // 6. Check Superfluid stream status
  const stream = await safe.agent!.checkStream();
  console.log(`\nSuperfluid stream: ${stream.active ? "ACTIVE (unlimited access)" : "Inactive"}`);
  if (!stream.active) {
    console.log(`  Start a stream of ~$${stream.monthlyUSDC || "86"}/month for unlimited access`);
  }
}

main().catch(console.error);
