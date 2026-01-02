const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // USDC addresses
  const USDC_ADDRESSES = {
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Polygon Mainnet USDC
    80002: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", // Polygon Amoy testnet USDC (mock)
  };

  const chainId = (await hre.ethers.provider.getNetwork()).chainId;
  const usdcAddress = USDC_ADDRESSES[Number(chainId)];

  if (!usdcAddress) {
    throw new Error(`No USDC address configured for chain ${chainId}`);
  }

  console.log("Using USDC at:", usdcAddress);
  console.log("Treasury:", deployer.address);

  // Deploy SafePassNFT
  console.log("\n1. Deploying SafePassNFT...");
  const SafePassNFT = await hre.ethers.getContractFactory("SafePassNFT");
  const safePassNFT = await SafePassNFT.deploy(usdcAddress, deployer.address);
  await safePassNFT.waitForDeployment();
  const safePassAddress = await safePassNFT.getAddress();
  console.log("SafePassNFT deployed to:", safePassAddress);

  // Deploy SafeScoreRegistry
  console.log("\n2. Deploying SafeScoreRegistry...");
  const SafeScoreRegistry = await hre.ethers.getContractFactory("SafeScoreRegistry");
  const safeScoreRegistry = await SafeScoreRegistry.deploy();
  await safeScoreRegistry.waitForDeployment();
  const registryAddress = await safeScoreRegistry.getAddress();
  console.log("SafeScoreRegistry deployed to:", registryAddress);

  // Set base URI for NFT metadata
  console.log("\n3. Setting base URI for NFT metadata...");
  const baseURI = process.env.NFT_METADATA_BASE_URI || "https://safescoring.io/api/nft/";
  await safePassNFT.setBaseURI(baseURI);
  console.log("Base URI set to:", baseURI);

  // Summary
  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("Chain ID:", chainId.toString());
  console.log("SafePassNFT:", safePassAddress);
  console.log("SafeScoreRegistry:", registryAddress);
  console.log("USDC:", usdcAddress);
  console.log("Treasury:", deployer.address);
  console.log("\nAdd these to your .env file:");
  console.log(`NEXT_PUBLIC_SAFEPASS_NFT_ADDRESS=${safePassAddress}`);
  console.log(`NEXT_PUBLIC_SCORE_REGISTRY_ADDRESS=${registryAddress}`);
  console.log("========================================");

  // Verify on Polygonscan (if API key is set)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\nWaiting 30 seconds before verification...");
    await new Promise((r) => setTimeout(r, 30000));

    console.log("Verifying SafePassNFT...");
    try {
      await hre.run("verify:verify", {
        address: safePassAddress,
        constructorArguments: [usdcAddress, deployer.address],
      });
    } catch (e) {
      console.log("Verification failed:", e.message);
    }

    console.log("Verifying SafeScoreRegistry...");
    try {
      await hre.run("verify:verify", {
        address: registryAddress,
        constructorArguments: [],
      });
    } catch (e) {
      console.log("Verification failed:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
