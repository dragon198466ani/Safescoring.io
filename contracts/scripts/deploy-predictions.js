/**
 * Deploy PredictionRegistry Contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy-predictions.js --network polygon
 *   npx hardhat run scripts/deploy-predictions.js --network sepolia
 *
 * Environment variables:
 *   PRIVATE_KEY - Deployer wallet private key
 *   POLYGONSCAN_API_KEY - For contract verification
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=".repeat(60));
  console.log("SafeScoring - Deploy PredictionRegistry");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log(`\nNetwork: ${network}`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // Deploy contract
  console.log("\n[*] Deploying PredictionRegistry...");

  const PredictionRegistry = await hre.ethers.getContractFactory("PredictionRegistry");
  const registry = await PredictionRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`[+] PredictionRegistry deployed to: ${address}`);

  // Get deployment transaction
  const deployTx = registry.deploymentTransaction();
  console.log(`    Transaction: ${deployTx.hash}`);

  // Wait for confirmations
  console.log("\n[*] Waiting for confirmations...");
  await deployTx.wait(5);
  console.log("[+] Confirmed!");

  // Save deployment info
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentDir, `${network}.json`);
  let deployment = {};

  // Load existing deployment if exists
  if (fs.existsSync(deploymentFile)) {
    deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  }

  // Add/update PredictionRegistry
  deployment.contracts = deployment.contracts || {};
  deployment.contracts.PredictionRegistry = {
    address: address,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    transactionHash: deployTx.hash,
    blockNumber: deployTx.blockNumber,
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
  console.log(`\n[+] Deployment saved to: ${deploymentFile}`);

  // Verify contract on explorer
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n[*] Verifying contract on explorer...");

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("[+] Contract verified!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("[+] Contract already verified");
      } else {
        console.log(`[-] Verification failed: ${error.message}`);
        console.log("    You can verify manually later with:");
        console.log(`    npx hardhat verify --network ${network} ${address}`);
      }
    }
  }

  // Print environment variable for Python script
  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS");
  console.log("=".repeat(60));
  console.log("\n1. Add to your .env file:");
  console.log(`   PREDICTION_REGISTRY_ADDRESS=${address}`);
  console.log(`   ${network.toUpperCase()}_RPC_URL=<your_rpc_url>`);
  console.log("\n2. Run the prediction publisher:");
  console.log("   python scripts/publish_predictions.py --generate --publish");
  console.log("\n3. View on explorer:");

  const explorers = {
    polygon: `https://polygonscan.com/address/${address}`,
    mumbai: `https://mumbai.polygonscan.com/address/${address}`,
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    mainnet: `https://etherscan.io/address/${address}`,
    arbitrum: `https://arbiscan.io/address/${address}`,
  };

  if (explorers[network]) {
    console.log(`   ${explorers[network]}`);
  }

  console.log("=".repeat(60));

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
