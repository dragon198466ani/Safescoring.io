/**
 * Superfluid Integration for USDC Streaming Subscriptions
 *
 * Superfluid allows continuous payment streams - user pays per second
 * instead of monthly lump sums. Cancel anytime, pay only for time used.
 *
 * Docs: https://docs.superfluid.finance/
 */

import { parseEther, formatUnits } from "viem";

// Superfluid contract addresses on Polygon
export const SUPERFLUID_ADDRESSES = {
  137: { // Polygon Mainnet
    host: "0x3E14dC1b13c488a8d5D310918780c983bD5982E7",
    cfaV1: "0x6EeE6060f715257b970700bc2656De21dEdF074C",
    usdcx: "0xCAa7349CEA390F89641fe306D93591f87595dc1F", // Super USDC
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  80002: { // Polygon Amoy Testnet
    host: "0x22ff293e14F1EC3A09B137e9e06084AFd63adDF9",
    cfaV1: "0xEd6BcbF6907D4feEEe8a8875543249bEa9D308E8",
    usdcx: "0x42bb40bF79730451B11f6De1CbA222F17b87Afd7", // Test Super USDC
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  },
};

// Monthly prices in USDC
export const SUBSCRIPTION_PRICES = {
  explorer: 19,
  professional: 49,
  enterprise: 299,
};

// Convert monthly price to flow rate (per second)
export function monthlyToFlowRate(monthlyUSDC) {
  // 1 month = 30 days = 2592000 seconds
  // Flow rate in wei (18 decimals for Super Tokens)
  const monthlyWei = BigInt(monthlyUSDC) * BigInt(10 ** 18);
  const flowRate = monthlyWei / BigInt(2592000);
  return flowRate;
}

// Convert flow rate to monthly price
export function flowRateToMonthly(flowRate) {
  const monthly = (BigInt(flowRate) * BigInt(2592000)) / BigInt(10 ** 18);
  return Number(monthly);
}

// ABIs for Superfluid interactions
export const SUPERFLUID_HOST_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "receiver", type: "address" },
      { name: "flowRate", type: "int96" },
    ],
    name: "createFlow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "receiver", type: "address" },
    ],
    name: "deleteFlow",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const CFA_V1_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "sender", type: "address" },
      { name: "receiver", type: "address" },
    ],
    name: "getFlow",
    outputs: [
      { name: "timestamp", type: "uint256" },
      { name: "flowRate", type: "int96" },
      { name: "deposit", type: "uint256" },
      { name: "owedDeposit", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export const SUPER_TOKEN_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "upgrade",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "downgrade",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "realtimeBalanceOfNow",
    outputs: [
      { name: "availableBalance", type: "int256" },
      { name: "deposit", type: "uint256" },
      { name: "owedDeposit", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * Get Superfluid addresses for a chain
 */
export function getSuperfluidAddresses(chainId = 137) {
  return SUPERFLUID_ADDRESSES[chainId] || SUPERFLUID_ADDRESSES[137];
}

/**
 * Treasury address that receives subscription payments
 */
export const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "0x...";
