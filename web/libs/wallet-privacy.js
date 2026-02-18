/**
 * Wallet Privacy Module
 *
 * Provides secure hashing and verification of wallet addresses.
 * Wallet addresses are hashed before storage to prevent tracking.
 *
 * SECURITY CONSIDERATIONS:
 * - Addresses are HMAC-SHA256 hashed with a secret salt
 * - The original address cannot be recovered from the hash
 * - Signature verification still works (uses ephemeral address)
 * - Duplicate detection works via hash comparison
 */

import crypto from "crypto";

// Get salt from environment or generate a warning
const WALLET_SALT = process.env.WALLET_HASH_SALT;

if (!WALLET_SALT && process.env.NODE_ENV === "production") {
  console.error(
    "[SECURITY CRITICAL] WALLET_HASH_SALT is not set! Wallet addresses will not be properly hashed."
  );
}

/**
 * Hash a wallet address using HMAC-SHA256
 * Returns a deterministic hash that can be used for lookups
 *
 * @param {string} address - The wallet address to hash
 * @returns {string} The hashed address (64 char hex)
 */
export function hashWalletAddress(address) {
  if (!address) return null;

  // Normalize to lowercase for consistent hashing
  const normalized = address.toLowerCase().trim();

  // If no salt configured, return a simple hash (less secure but functional)
  if (!WALLET_SALT) {
    console.warn("[SECURITY] Hashing wallet without salt - configure WALLET_HASH_SALT");
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  // HMAC-SHA256 with secret salt
  return crypto
    .createHmac("sha256", WALLET_SALT)
    .update(normalized)
    .digest("hex");
}

/**
 * Verify if a given address matches a stored hash
 *
 * @param {string} address - The wallet address to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {boolean} True if the address matches the hash
 */
export function verifyWalletAddress(address, storedHash) {
  if (!address || !storedHash) return false;

  const computedHash = hashWalletAddress(address);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

/**
 * Generate a masked display version of a wallet address
 * 0x1234567890abcdef1234567890abcdef12345678 -> 0x1234...5678
 *
 * @param {string} address - The wallet address
 * @returns {string} Masked address for display
 */
export function maskWalletAddress(address) {
  if (!address || address.length < 12) return "***";

  // Handle checksummed and lowercase addresses
  const prefix = address.startsWith("0x") ? "0x" : "";
  const cleanAddress = address.startsWith("0x") ? address.slice(2) : address;

  if (cleanAddress.length < 8) return "***";

  return `${prefix}${cleanAddress.slice(0, 4)}...${cleanAddress.slice(-4)}`;
}

/**
 * Create a privacy-preserving wallet identifier
 * This generates a shorter identifier for display purposes
 *
 * @param {string} hash - The wallet hash
 * @returns {string} Short identifier (first 8 chars of hash)
 */
export function getWalletIdentifier(hash) {
  if (!hash) return null;
  return hash.slice(0, 8);
}

/**
 * Validate wallet hash format
 *
 * @param {string} hash - The hash to validate
 * @returns {boolean} True if valid SHA-256 hex format
 */
export function isValidWalletHash(hash) {
  if (!hash || typeof hash !== "string") return false;
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Generate a lookup key for the wallet
 * This can be used for database indexing while maintaining privacy
 *
 * @param {string} address - The wallet address
 * @returns {string} First 16 chars of hash (for indexing)
 */
export function getWalletLookupKey(address) {
  const hash = hashWalletAddress(address);
  return hash ? hash.slice(0, 16) : null;
}

export default {
  hashWalletAddress,
  verifyWalletAddress,
  maskWalletAddress,
  getWalletIdentifier,
  isValidWalletHash,
  getWalletLookupKey,
};
