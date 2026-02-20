/**
 * Email Privacy Module
 *
 * Provides secure hashing and masking of email addresses.
 * Emails are hashed before storage to prevent tracking and data breaches.
 *
 * SECURITY CONSIDERATIONS:
 * - Emails are HMAC-SHA256 hashed with a secret salt
 * - The original email cannot be recovered from the hash
 * - Login still works via hash comparison
 * - Duplicate detection works via hash comparison
 */

import crypto from "crypto";

// Get salt from environment or generate a warning
const EMAIL_SALT = process.env.EMAIL_HASH_SALT || process.env.WALLET_HASH_SALT;

if (!EMAIL_SALT && process.env.NODE_ENV === "production") {
  console.error(
    "[SECURITY CRITICAL] EMAIL_HASH_SALT is not set! Emails will not be properly hashed."
  );
}

/**
 * Hash an email address using HMAC-SHA256
 * Returns a deterministic hash that can be used for lookups
 *
 * @param {string} email - The email address to hash
 * @returns {string} The hashed email (64 char hex)
 */
export function hashEmail(email) {
  if (!email) return null;

  // Normalize: lowercase and trim
  const normalized = email.toLowerCase().trim();

  // If no salt configured, return a simple hash (less secure but functional)
  if (!EMAIL_SALT) {
    console.warn("[SECURITY] Hashing email without salt - configure EMAIL_HASH_SALT");
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  // HMAC-SHA256 with secret salt
  return crypto
    .createHmac("sha256", EMAIL_SALT)
    .update(normalized)
    .digest("hex");
}

/**
 * Verify if a given email matches a stored hash
 *
 * @param {string} email - The email address to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {boolean} True if the email matches the hash
 */
export function verifyEmail(email, storedHash) {
  if (!email || !storedHash) return false;

  const computedHash = hashEmail(email);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(storedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Generate a masked display version of an email
 * user@example.com -> u***@e***.com
 *
 * @param {string} email - The email address
 * @returns {string} Masked email for display
 */
export function maskEmail(email) {
  if (!email || !email.includes("@")) return "***@***.***";

  const [localPart, domain] = email.split("@");
  const [domainName, ...tld] = domain.split(".");

  const maskedLocal = localPart.length > 1
    ? localPart[0] + "*".repeat(Math.min(localPart.length - 1, 3))
    : "*";

  const maskedDomain = domainName.length > 1
    ? domainName[0] + "*".repeat(Math.min(domainName.length - 1, 3))
    : "*";

  return `${maskedLocal}@${maskedDomain}.${tld.join(".")}`;
}

/**
 * Create a privacy-preserving email identifier
 * This generates a shorter identifier for display purposes
 *
 * @param {string} hash - The email hash
 * @returns {string} Short identifier (first 8 chars of hash)
 */
export function getEmailIdentifier(hash) {
  if (!hash) return null;
  return hash.slice(0, 8);
}

/**
 * Validate email hash format
 *
 * @param {string} hash - The hash to validate
 * @returns {boolean} True if valid SHA-256 hex format
 */
export function isValidEmailHash(hash) {
  if (!hash || typeof hash !== "string") return false;
  return /^[a-f0-9]{64}$/i.test(hash);
}

/**
 * Generate a lookup key for the email
 * This can be used for database indexing while maintaining privacy
 *
 * @param {string} email - The email address
 * @returns {string} First 16 chars of hash (for indexing)
 */
export function getEmailLookupKey(email) {
  const hash = hashEmail(email);
  return hash ? hash.slice(0, 16) : null;
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * For data that needs to be recoverable (unlike hashes)
 *
 * @param {string} data - The data to encrypt
 * @returns {string} Encrypted data as base64
 */
export function encryptData(data) {
  if (!data) return null;

  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    console.error("[SECURITY] ENCRYPTION_KEY not set or too short");
    return null;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(key.slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt data encrypted with encryptData
 *
 * @param {string} encryptedData - The encrypted data
 * @returns {string|null} Decrypted data or null on failure
 */
export function decryptData(encryptedData) {
  if (!encryptedData) return null;

  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    console.error("[SECURITY] ENCRYPTION_KEY not set or too short");
    return null;
  }

  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key.slice(0, 32)),
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[SECURITY] Decryption failed:", error.message);
    return null;
  }
}

export default {
  hashEmail,
  verifyEmail,
  maskEmail,
  getEmailIdentifier,
  isValidEmailHash,
  getEmailLookupKey,
  encryptData,
  decryptData,
};
