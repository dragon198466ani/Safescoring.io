/**
 * Contract addresses (can be imported from both client and server)
 */

export const CONTRACT_ADDRESSES = {
  // Polygon Mainnet
  137: {
    safePassNFT: process.env.NEXT_PUBLIC_SAFEPASS_NFT_ADDRESS,
    scoreRegistry: process.env.NEXT_PUBLIC_SCORE_REGISTRY_ADDRESS,
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  },
  // Polygon Amoy Testnet
  80002: {
    safePassNFT: process.env.NEXT_PUBLIC_SAFEPASS_NFT_ADDRESS_TESTNET,
    scoreRegistry: process.env.NEXT_PUBLIC_SCORE_REGISTRY_ADDRESS_TESTNET,
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  },
};
