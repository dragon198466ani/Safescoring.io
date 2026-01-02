import { createPublicClient, http, formatUnits, parseUnits } from "viem";
import { polygon, polygonAmoy } from "viem/chains";
import { CONTRACT_ADDRESSES } from "./contract-addresses";

// ABIs (minimal for client-side usage)
export const SAFEPASS_NFT_ABI = [
  {
    inputs: [{ name: "tier", type: "uint8" }],
    name: "mint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "requiredTier", type: "uint8" },
    ],
    name: "hasAccess",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getHighestTier",
    outputs: [
      { name: "hasNFT", type: "bool" },
      { name: "highestTier", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tier", type: "uint8" }],
    name: "getTierInfo",
    outputs: [
      { name: "priceUSDC", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "minted", type: "uint256" },
      { name: "remaining", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

export const SCORE_REGISTRY_ABI = [
  {
    inputs: [{ name: "productId", type: "uint256" }],
    name: "getScore",
    outputs: [
      {
        components: [
          { name: "overall", type: "uint8" },
          { name: "security", type: "uint8" },
          { name: "adversity", type: "uint8" },
          { name: "fidelity", type: "uint8" },
          { name: "efficiency", type: "uint8" },
          { name: "evaluationHash", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
          { name: "normVersion", type: "uint16" },
        ],
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "productId", type: "uint256" }],
    name: "hasScore",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];

export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Tier enum mapping
export const TIERS = {
  Explorer: 0,
  Professional: 1,
  Enterprise: 2,
};

export const TIER_NAMES = ["Explorer", "Professional", "Enterprise"];

// Create public client for read operations
const isProduction = process.env.NODE_ENV === "production";
const chain = isProduction ? polygon : polygonAmoy;

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});

/**
 * Get contract addresses for current chain
 */
export function getAddresses(chainId = chain.id) {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[137];
}

/**
 * Check if a wallet has NFT access
 */
export async function checkNFTAccess(walletAddress, requiredTier = 0) {
  const addresses = getAddresses();
  if (!addresses.safePassNFT) return { hasAccess: false, tier: null };

  try {
    const result = await publicClient.readContract({
      address: addresses.safePassNFT,
      abi: SAFEPASS_NFT_ABI,
      functionName: "getHighestTier",
      args: [walletAddress],
    });

    return {
      hasAccess: result[0] && result[1] >= requiredTier,
      hasNFT: result[0],
      tier: result[0] ? TIER_NAMES[result[1]] : null,
      tierLevel: result[0] ? result[1] : null,
    };
  } catch (error) {
    console.error("Error checking NFT access:", error);
    return { hasAccess: false, tier: null };
  }
}

/**
 * Get tier pricing info
 */
export async function getTierInfo(tier = 0) {
  const addresses = getAddresses();
  if (!addresses.safePassNFT) return null;

  try {
    const result = await publicClient.readContract({
      address: addresses.safePassNFT,
      abi: SAFEPASS_NFT_ABI,
      functionName: "getTierInfo",
      args: [tier],
    });

    return {
      priceUSDC: formatUnits(result[0], 6),
      priceRaw: result[0],
      maxSupply: Number(result[1]),
      minted: Number(result[2]),
      remaining: Number(result[3]),
      active: result[4],
    };
  } catch (error) {
    console.error("Error getting tier info:", error);
    return null;
  }
}

/**
 * Get USDC balance for a wallet
 */
export async function getUSDCBalance(walletAddress) {
  const addresses = getAddresses();

  try {
    const balance = await publicClient.readContract({
      address: addresses.usdc,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletAddress],
    });

    return formatUnits(balance, 6);
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return "0";
  }
}

/**
 * Check USDC allowance
 */
export async function checkUSDCAllowance(walletAddress, spenderAddress) {
  const addresses = getAddresses();

  try {
    const allowance = await publicClient.readContract({
      address: addresses.usdc,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [walletAddress, spenderAddress],
    });

    return formatUnits(allowance, 6);
  } catch (error) {
    console.error("Error checking allowance:", error);
    return "0";
  }
}

/**
 * Get on-chain score for a product
 */
export async function getOnChainScore(productId) {
  const addresses = getAddresses();
  if (!addresses.scoreRegistry) return null;

  try {
    const hasScore = await publicClient.readContract({
      address: addresses.scoreRegistry,
      abi: SCORE_REGISTRY_ABI,
      functionName: "hasScore",
      args: [BigInt(productId)],
    });

    if (!hasScore) return { verified: false };

    const score = await publicClient.readContract({
      address: addresses.scoreRegistry,
      abi: SCORE_REGISTRY_ABI,
      functionName: "getScore",
      args: [BigInt(productId)],
    });

    return {
      verified: true,
      overall: score.overall,
      security: score.security,
      adversity: score.adversity,
      fidelity: score.fidelity,
      efficiency: score.efficiency,
      evaluationHash: score.evaluationHash,
      timestamp: new Date(Number(score.timestamp) * 1000),
      normVersion: score.normVersion,
    };
  } catch (error) {
    console.error("Error getting on-chain score:", error);
    return { verified: false };
  }
}
