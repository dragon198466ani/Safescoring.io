/**
 * Deploy SAFEToken v2 (Autonomous Tokenomics) + Vesting + Staking
 *
 * AUTONOMOUS MODEL: 0% of EUR subscription revenue goes to the token.
 * EUR revenue = founder's income. Token = separate economy.
 *
 * Deployment order:
 * 1. SAFEToken (community + liquidity wallets)
 * 2. SAFEVesting x2 (team + treasury vesting)
 * 3. Lock vesting contracts in SAFEToken (irreversible)
 * 4. Mint team/treasury tokens TO vesting contracts
 * 5. SAFEStaking (pure utility — feature access tiers)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-safe-token.js --network polygon
 *   npx hardhat run scripts/deploy-safe-token.js --network polygonAmoy  (testnet)
 *
 * Required env vars in config/.env:
 *   DEPLOYER_PRIVATE_KEY=your_private_key
 *   POLYGONSCAN_API_KEY=your_api_key (for verification)
 */

const hre = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("  DEPLOYING $SAFE TOKEN v2 (AUTONOMOUS MODEL)");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log("Balance:", hre.ethers.formatEther(balance));
  console.log("Network:", hre.network.name, "| Chain ID:", chainId);

  // Wallet addresses — UPDATE THESE before mainnet deployment
  const communityRewardsWallet = deployer.address;  // TODO: Create dedicated wallet
  const liquidityWallet = deployer.address;         // TODO: Create dedicated wallet
  const teamBeneficiary = deployer.address;         // TODO: Team multi-sig
  const treasuryBeneficiary = deployer.address;     // TODO: Treasury multi-sig

  console.log("\nConfiguration:");
  console.log("  Community Rewards:", communityRewardsWallet);
  console.log("  Liquidity:", liquidityWallet);
  console.log("  Team Beneficiary:", teamBeneficiary);
  console.log("  Treasury Beneficiary:", treasuryBeneficiary);

  // =========================================
  // STEP 1: Deploy SAFEToken
  // =========================================
  console.log("\n--- Step 1: Deploying SAFEToken ---");

  const SAFEToken = await hre.ethers.getContractFactory("SAFEToken");
  const safeToken = await SAFEToken.deploy(
    communityRewardsWallet,
    liquidityWallet
  );
  await safeToken.waitForDeployment();
  const tokenAddress = await safeToken.getAddress();
  console.log("SAFEToken deployed to:", tokenAddress);

  // =========================================
  // STEP 2: Deploy Vesting Contracts
  // =========================================
  console.log("\n--- Step 2: Deploying Vesting Contracts ---");

  const SAFEVesting = await hre.ethers.getContractFactory("SAFEVesting");
  const startTimestamp = Math.floor(Date.now() / 1000); // TGE = now

  // Team vesting: 12-month cliff, 36-month linear
  const teamVesting = await SAFEVesting.deploy(
    tokenAddress,
    teamBeneficiary,
    hre.ethers.parseEther("20000000"), // 20M tokens
    startTimestamp,
    12, // 12-month cliff
    36  // 36-month linear vesting
  );
  await teamVesting.waitForDeployment();
  const teamVestingAddress = await teamVesting.getAddress();
  console.log("Team Vesting deployed to:", teamVestingAddress);
  console.log("  Cliff ends:", new Date((startTimestamp + 12 * 30 * 86400) * 1000).toISOString());
  console.log("  Fully vested:", new Date((startTimestamp + 48 * 30 * 86400) * 1000).toISOString());

  // Treasury vesting: 6-month cliff, 24-month linear
  const treasuryVesting = await SAFEVesting.deploy(
    tokenAddress,
    treasuryBeneficiary,
    hre.ethers.parseEther("20000000"), // 20M tokens
    startTimestamp,
    6,  // 6-month cliff
    24  // 24-month linear vesting
  );
  await treasuryVesting.waitForDeployment();
  const treasuryVestingAddress = await treasuryVesting.getAddress();
  console.log("Treasury Vesting deployed to:", treasuryVestingAddress);

  // =========================================
  // STEP 3: Lock Vesting in Token (irreversible)
  // =========================================
  console.log("\n--- Step 3: Locking Vesting Contracts (IRREVERSIBLE) ---");

  const lockTx = await safeToken.setAndLockVestingContracts(
    teamVestingAddress,
    treasuryVestingAddress
  );
  await lockTx.wait();
  console.log("Vesting contracts locked. Team/Treasury can ONLY mint to vesting.");

  // =========================================
  // STEP 4: Mint to Vesting Contracts
  // =========================================
  console.log("\n--- Step 4: Minting Tokens to Vesting ---");

  const mintTeamTx = await safeToken.mintToTeamVesting(hre.ethers.parseEther("20000000"));
  await mintTeamTx.wait();
  console.log("20M SAFE minted to team vesting (locked 12+36 months)");

  const mintTreasuryTx = await safeToken.mintToTreasuryVesting(hre.ethers.parseEther("20000000"));
  await mintTreasuryTx.wait();
  console.log("20M SAFE minted to treasury vesting (locked 6+24 months)");

  // =========================================
  // STEP 5: Deploy Staking (Pure Utility)
  // =========================================
  console.log("\n--- Step 5: Deploying SAFEStaking (Utility — Feature Access) ---");

  const SAFEStaking = await hre.ethers.getContractFactory("SAFEStaking");
  const staking = await SAFEStaking.deploy(tokenAddress);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("SAFEStaking deployed to:", stakingAddress);

  // =========================================
  // SUMMARY
  // =========================================
  const totalSupply = await safeToken.totalSupply();
  const allocations = await safeToken.getRemainingAllocations();

  console.log("\n" + "=".repeat(60));
  console.log("  DEPLOYMENT COMPLETE — AUTONOMOUS TOKEN MODEL");
  console.log("=".repeat(60));
  console.log("\nContracts:");
  console.log("  SAFEToken:         ", tokenAddress);
  console.log("  Team Vesting:      ", teamVestingAddress);
  console.log("  Treasury Vesting:  ", treasuryVestingAddress);
  console.log("  SAFEStaking:       ", stakingAddress);
  console.log("\nSupply:");
  console.log("  Total Minted:      ", hre.ethers.formatEther(totalSupply), "SAFE");
  console.log("  Community Remaining:", hre.ethers.formatEther(allocations[0]), "SAFE");
  console.log("  Treasury Remaining: ", hre.ethers.formatEther(allocations[1]), "SAFE");
  console.log("  Team Remaining:     ", hre.ethers.formatEther(allocations[2]), "SAFE");
  console.log("\nModel:");
  console.log("  EUR revenue:        100% founder (0% to token)");
  console.log("  Staking:            Feature access only (no USDC yield)");
  console.log("  Token value from:   Buy demand (features) + Spend burn (50%) + Halving");
  console.log("  Vesting locked:     YES (irreversible)");
  console.log("  Team dump possible: NO (12-month cliff + 36-month linear)");
  console.log("  Emission halving:   500K/month → 250K → 125K → ...");

  // Verify contracts
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await safeToken.deploymentTransaction().wait(5);

    const contractsToVerify = [
      { address: tokenAddress, args: [communityRewardsWallet, liquidityWallet] },
      { address: teamVestingAddress, args: [tokenAddress, teamBeneficiary, hre.ethers.parseEther("20000000"), startTimestamp, 12, 36] },
      { address: treasuryVestingAddress, args: [tokenAddress, treasuryBeneficiary, hre.ethers.parseEther("20000000"), startTimestamp, 6, 24] },
      { address: stakingAddress, args: [tokenAddress] },
    ];

    for (const contract of contractsToVerify) {
      try {
        await hre.run("verify:verify", {
          address: contract.address,
          constructorArguments: contract.args,
        });
        console.log(`Verified: ${contract.address}`);
      } catch (error) {
        if (error.message.includes("Already Verified")) {
          console.log(`Already verified: ${contract.address}`);
        } else {
          console.log(`Verification failed for ${contract.address}:`, error.message);
        }
      }
    }
  }

  // Output for contract-addresses.js
  console.log("\n" + "=".repeat(60));
  console.log("  ADD TO web/libs/contract-addresses.js:");
  console.log("=".repeat(60));
  console.log(`
  safeToken: { ${chainId}: "${tokenAddress}" },
  teamVesting: { ${chainId}: "${teamVestingAddress}" },
  treasuryVesting: { ${chainId}: "${treasuryVestingAddress}" },
  safeStaking: { ${chainId}: "${stakingAddress}" },
`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
