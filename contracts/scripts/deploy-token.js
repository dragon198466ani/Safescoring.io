const hre = require("hardhat");

/**
 * Deploy SAFEToken to blockchain
 *
 * Usage:
 *   npx hardhat run scripts/deploy-token.js --network sepolia
 *   npx hardhat run scripts/deploy-token.js --network base
 *
 * Required env vars:
 *   - DEPLOYER_PRIVATE_KEY
 *   - COMMUNITY_WALLET (optional, defaults to deployer)
 *   - TREASURY_WALLET (optional, defaults to deployer)
 *   - TEAM_WALLET (optional, defaults to deployer)
 *   - LIQUIDITY_WALLET (optional, defaults to deployer)
 */

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying SAFEToken with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Wallet addresses (default to deployer if not set)
  const communityWallet = process.env.COMMUNITY_WALLET || deployer.address;
  const treasuryWallet = process.env.TREASURY_WALLET || deployer.address;
  const teamWallet = process.env.TEAM_WALLET || deployer.address;
  const liquidityWallet = process.env.LIQUIDITY_WALLET || deployer.address;

  console.log("\nWallet Configuration:");
  console.log("  Community Rewards:", communityWallet);
  console.log("  Treasury:", treasuryWallet);
  console.log("  Team:", teamWallet);
  console.log("  Liquidity:", liquidityWallet);

  // Deploy SAFEToken
  console.log("\nDeploying SAFEToken...");
  const SAFEToken = await hre.ethers.getContractFactory("SAFEToken");
  const safeToken = await SAFEToken.deploy(
    communityWallet,
    treasuryWallet,
    teamWallet,
    liquidityWallet
  );
  await safeToken.waitForDeployment();
  const tokenAddress = await safeToken.getAddress();

  console.log("\n========================================");
  console.log("SAFETOKEN DEPLOYED");
  console.log("========================================");
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  console.log("Chain ID:", chainId.toString());
  console.log("Token Address:", tokenAddress);
  console.log("Name:", await safeToken.name());
  console.log("Symbol:", await safeToken.symbol());
  console.log("Total Supply:", hre.ethers.formatEther(await safeToken.totalSupply()), "SAFE");

  // Check initial liquidity allocation
  const liquidityBalance = await safeToken.balanceOf(liquidityWallet);
  console.log("\nInitial Liquidity Minted:", hre.ethers.formatEther(liquidityBalance), "SAFE");

  // Get remaining allocations
  const allocations = await safeToken.getRemainingAllocations();
  console.log("\nRemaining Allocations:");
  console.log("  Community:", hre.ethers.formatEther(allocations[0]), "SAFE");
  console.log("  Treasury:", hre.ethers.formatEther(allocations[1]), "SAFE");
  console.log("  Team:", hre.ethers.formatEther(allocations[2]), "SAFE");
  console.log("  Liquidity:", hre.ethers.formatEther(allocations[3]), "SAFE");

  // Deploy SAFEStaking
  console.log("\nDeploying SAFEStaking...");
  const SAFEStaking = await hre.ethers.getContractFactory("SAFEStaking");
  const safeStaking = await SAFEStaking.deploy(tokenAddress);
  await safeStaking.waitForDeployment();
  const stakingAddress = await safeStaking.getAddress();
  console.log("SAFEStaking deployed to:", stakingAddress);

  // Fund staking contract with initial rewards (1M SAFE from community pool)
  const INITIAL_REWARDS = hre.ethers.parseEther("1000000"); // 1M SAFE
  console.log("\nFunding staking rewards pool...");

  // First mint community tokens to deployer
  await safeToken.mintCommunityRewards(deployer.address, INITIAL_REWARDS);
  console.log("Minted 1M SAFE for staking rewards");

  // Approve and fund staking contract
  await safeToken.approve(stakingAddress, INITIAL_REWARDS);
  await safeStaking.fundRewardPool(INITIAL_REWARDS);
  console.log("Funded staking contract with 1M SAFE");

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Chain ID:", chainId.toString());
  console.log("SAFEToken:", tokenAddress);
  console.log("SAFEStaking:", stakingAddress);
  console.log("\nAdd to your .env:");
  console.log(`NEXT_PUBLIC_SAFE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_SAFE_STAKING_ADDRESS=${stakingAddress}`);
  console.log("========================================");

  // Verify on explorer if API key available
  const apiKey = process.env.ETHERSCAN_API_KEY ||
                 process.env.BASESCAN_API_KEY ||
                 process.env.ARBISCAN_API_KEY;

  if (apiKey && chainId !== 31337n) {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise((r) => setTimeout(r, 30000));

    console.log("Verifying SAFEToken...");
    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [
          communityWallet,
          treasuryWallet,
          teamWallet,
          liquidityWallet
        ],
      });
      console.log("SAFEToken verification successful!");
    } catch (e) {
      console.log("SAFEToken verification failed:", e.message);
    }

    console.log("Verifying SAFEStaking...");
    try {
      await hre.run("verify:verify", {
        address: stakingAddress,
        constructorArguments: [tokenAddress],
      });
      console.log("SAFEStaking verification successful!");
    } catch (e) {
      console.log("SAFEStaking verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
