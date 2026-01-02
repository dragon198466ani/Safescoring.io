"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygon, polygonAmoy } from "wagmi/chains";

// Re-export CONTRACT_ADDRESSES for backwards compatibility
export { CONTRACT_ADDRESSES } from "./contract-addresses";

// Determine which chain to use based on environment
const isProduction = process.env.NODE_ENV === "production";
const defaultChain = isProduction ? polygon : polygonAmoy;

export const wagmiConfig = getDefaultConfig({
  appName: "SafeScoring",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [polygon, polygonAmoy],
  ssr: true,
});

export { polygon, polygonAmoy, defaultChain };
