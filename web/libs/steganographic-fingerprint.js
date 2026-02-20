/**
 * Steganographic Fingerprinting System
 *
 * Embeds invisible, unique fingerprints directly INTO the data itself.
 * Even if someone copies the data, we can prove it came from SafeScoring.
 *
 * AI-PROOF because:
 * 1. Variations are mathematically unique per client
 * 2. Cannot be detected without knowing the algorithm
 * 3. Cannot be removed without destroying data integrity
 */

import crypto from "crypto";

// Secret key for fingerprint generation
// CRITICAL: Must be set in production via FINGERPRINT_SECRET env var
const DEFAULT_SECRET = "ss-fingerprint-v1-dev-only";
const FINGERPRINT_SECRET = process.env.FINGERPRINT_SECRET || DEFAULT_SECRET;

// Warn in production if using default secret
if (process.env.NODE_ENV === "production" && FINGERPRINT_SECRET === DEFAULT_SECRET) {
  console.error(
    "[SECURITY WARNING] FINGERPRINT_SECRET not set! Anti-copy protection is ineffective. " +
    "Generate with: openssl rand -base64 32"
  );
}

/**
 * Generate deterministic fingerprint for a client
 * Same client always gets same fingerprint pattern
 */
export function generateClientFingerprint(clientId, timestamp) {
  const hash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientId}:${timestamp}`)
    .digest("hex");

  return {
    // First 8 chars = score variation seed
    scoreSeed: parseInt(hash.substring(0, 8), 16),
    // Next 8 chars = text variation seed
    textSeed: parseInt(hash.substring(8, 16), 16),
    // Next 8 chars = order variation seed
    orderSeed: parseInt(hash.substring(16, 24), 16),
    // Full hash for verification
    fullHash: hash,
  };
}

/**
 * Apply invisible score variations
 * Scores vary by ±0.01-0.05 per client (imperceptible but traceable)
 *
 * Example: Score 87.50 might become 87.52 for client A, 87.48 for client B
 */
export function fingerprintScore(score, clientFingerprint, productId) {
  if (typeof score !== "number") return score;

  // Generate deterministic variation for this score + client + product
  const variationHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.scoreSeed}:${productId}:${score}`)
    .digest("hex");

  // Convert to small variation: -0.05 to +0.05
  const variationFactor = (parseInt(variationHash.substring(0, 4), 16) / 65535) - 0.5;
  const variation = variationFactor * 0.1; // ±0.05 max

  // Apply variation (keep 2 decimal places)
  return Math.round((score + variation) * 100) / 100;
}

/**
 * Apply invisible text variations
 * Uses Unicode homoglyphs (visually identical characters)
 *
 * Example: "Ledger" might use different Unicode for 'e' per client
 */
const HOMOGLYPH_MAP = {
  // Latin -> Cyrillic/Greek lookalikes (visually identical)
  'a': ['a', 'а'],  // Latin a, Cyrillic а
  'e': ['e', 'е'],  // Latin e, Cyrillic е
  'o': ['o', 'о'],  // Latin o, Cyrillic о
  'p': ['p', 'р'],  // Latin p, Cyrillic р
  'c': ['c', 'с'],  // Latin c, Cyrillic с
  'x': ['x', 'х'],  // Latin x, Cyrillic х
  'y': ['y', 'у'],  // Latin y, Cyrillic у
  // Invisible characters
  ' ': [' ', '\u200B'],  // Space, zero-width space
};

export function fingerprintText(text, clientFingerprint, fieldName) {
  if (typeof text !== "string" || text.length === 0) return text;

  // Generate deterministic pattern for this text + client
  const patternHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.textSeed}:${fieldName}:${text.substring(0, 20)}`)
    .digest("hex");

  // Apply homoglyphs at specific positions based on hash
  let result = text;
  const positions = [];

  // Select 1-3 positions to modify based on hash
  for (let i = 0; i < Math.min(3, text.length); i++) {
    const pos = parseInt(patternHash.substring(i * 2, i * 2 + 2), 16) % text.length;
    positions.push(pos);
  }

  // Apply modifications
  const chars = [...result];
  for (const pos of positions) {
    const char = chars[pos].toLowerCase();
    if (HOMOGLYPH_MAP[char]) {
      const variants = HOMOGLYPH_MAP[char];
      const variantIndex = parseInt(patternHash.substring(6, 8), 16) % variants.length;
      // Preserve original case
      chars[pos] = chars[pos] === chars[pos].toUpperCase()
        ? variants[variantIndex].toUpperCase()
        : variants[variantIndex];
    }
  }

  return chars.join("");
}

/**
 * Apply invisible array order variations
 * Slightly reorder items in a deterministic way per client
 *
 * Example: Product list order varies slightly per client
 */
export function fingerprintArrayOrder(items, clientFingerprint, listName) {
  if (!Array.isArray(items) || items.length < 3) return items;

  // Generate swap pattern based on client
  const swapHash = crypto
    .createHmac("sha256", FINGERPRINT_SECRET)
    .update(`${clientFingerprint.orderSeed}:${listName}:${items.length}`)
    .digest("hex");

  const result = [...items];

  // Perform 1-2 adjacent swaps (imperceptible but traceable)
  const numSwaps = (parseInt(swapHash.substring(0, 2), 16) % 2) + 1;

  for (let i = 0; i < numSwaps; i++) {
    const pos = parseInt(swapHash.substring(i * 4 + 2, i * 4 + 6), 16) % (result.length - 1);
    // Only swap adjacent items with same/similar score
    if (result[pos].safe_score === result[pos + 1]?.safe_score) {
      [result[pos], result[pos + 1]] = [result[pos + 1], result[pos]];
    }
  }

  return result;
}

/**
 * Extract fingerprint from data (for detection of copies)
 * Returns suspected client ID if data appears to be copied
 */
export function detectFingerprint(data, knownClients) {
  // This would require storing fingerprint patterns in a database
  // and comparing against known client patterns
  // Implementation depends on what data fields you're checking

  const suspects = [];

  for (const [clientId, patterns] of Object.entries(knownClients)) {
    let matchScore = 0;

    // Check score variations
    if (data.safe_score) {
      const expectedScore = patterns.expectedScores?.[data.product_id];
      if (expectedScore && Math.abs(data.safe_score - expectedScore) < 0.06) {
        matchScore += 0.5;
      }
    }

    // Check text patterns (homoglyphs)
    if (data.name) {
      const hasCyrillic = /[\u0400-\u04FF]/.test(data.name);
      if (hasCyrillic === patterns.usesCyrillic) {
        matchScore += 0.3;
      }
    }

    if (matchScore > 0.5) {
      suspects.push({ clientId, confidence: matchScore });
    }
  }

  return suspects.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Main function: Apply all fingerprints to API response
 */
export function fingerprintResponse(data, clientId, endpoint) {
  const timestamp = Math.floor(Date.now() / 86400000); // Daily rotation
  const fingerprint = generateClientFingerprint(clientId, timestamp);

  // Deep clone data
  const result = JSON.parse(JSON.stringify(data));

  // Apply fingerprints recursively
  const applyFingerprints = (obj, path = "") => {
    if (Array.isArray(obj)) {
      // Fingerprint array order if it's a product list
      if (path.includes("products") || path.includes("items")) {
        return fingerprintArrayOrder(
          obj.map((item, i) => applyFingerprints(item, `${path}[${i}]`)),
          fingerprint,
          path
        );
      }
      return obj.map((item, i) => applyFingerprints(item, `${path}[${i}]`));
    }

    if (obj && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;

        // Apply score fingerprinting
        if (key.includes("score") && typeof value === "number") {
          result[key] = fingerprintScore(value, fingerprint, obj.id || obj.product_id || path);
        }
        // Apply text fingerprinting to names/descriptions
        else if ((key === "name" || key === "description") && typeof value === "string") {
          result[key] = fingerprintText(value, fingerprint, fieldPath);
        }
        // Recurse for nested objects
        else {
          result[key] = applyFingerprints(value, fieldPath);
        }
      }
      return result;
    }

    return obj;
  };

  return applyFingerprints(result);
}

/**
 * Verify if data came from SafeScoring (for legal purposes)
 */
export function verifyDataOrigin(suspectedCopy, originalData, clientId) {
  const timestamp = Math.floor(Date.now() / 86400000);
  const fingerprint = generateClientFingerprint(clientId, timestamp);

  // Check if the variations match what we would have sent to this client
  const expectedFingerprinted = fingerprintResponse(originalData, clientId, "verification");

  // Compare key fields
  const matches = {
    scoreMatch: false,
    textMatch: false,
    orderMatch: false,
  };

  // Score comparison (within fingerprint variation range)
  if (suspectedCopy.safe_score && expectedFingerprinted.safe_score) {
    matches.scoreMatch = Math.abs(suspectedCopy.safe_score - expectedFingerprinted.safe_score) < 0.001;
  }

  // Text comparison (exact match including homoglyphs)
  if (suspectedCopy.name && expectedFingerprinted.name) {
    matches.textMatch = suspectedCopy.name === expectedFingerprinted.name;
  }

  return {
    isMatch: matches.scoreMatch && matches.textMatch,
    confidence: (matches.scoreMatch ? 0.5 : 0) + (matches.textMatch ? 0.5 : 0),
    details: matches,
  };
}
