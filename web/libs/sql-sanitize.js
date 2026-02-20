/**
 * SQL Sanitization Utilities
 *
 * Protects against SQL injection attacks, specifically ILIKE injection
 * with wildcard characters (%, _, \)
 */

/**
 * Escape SQL ILIKE special characters to prevent injection
 *
 * Protects against attacks like:
 * - `%%%` (wildcard overflow - bypasses pagination)
 * - `_` (single character wildcard)
 * - `\` (escape character)
 *
 * @param {string} input - User input string
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string|null} Sanitized string or null if input is empty
 *
 * @example
 * sanitizeILIKE("test%") // Returns: "test\\%"
 * sanitizeILIKE("___")   // Returns: "\\_\\_\\_"
 * sanitizeILIKE("a".repeat(200)) // Returns: truncated to maxLength
 */
export function sanitizeILIKE(input, maxLength = 100) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Escape special ILIKE characters: %, _, and \
  // The backslash itself must be escaped first to avoid double-escaping
  const escaped = trimmed
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent (matches any sequence)
    .replace(/_/g, '\\_');   // Escape underscore (matches any single char)

  // Limit length to prevent DoS via very long queries
  return escaped.substring(0, maxLength);
}

/**
 * Validate and sanitize search query
 *
 * Combines length validation, trimming, and ILIKE escaping
 *
 * @param {string} query - Search query
 * @param {object} options - Validation options
 * @param {number} options.minLength - Minimum length (default: 2)
 * @param {number} options.maxLength - Maximum length (default: 100)
 * @returns {object} { valid: boolean, sanitized: string|null, error: string|null }
 *
 * @example
 * validateSearchQuery("test")
 * // Returns: { valid: true, sanitized: "test", error: null }
 *
 * validateSearchQuery("a")
 * // Returns: { valid: false, sanitized: null, error: "Query too short" }
 *
 * validateSearchQuery("test%%%")
 * // Returns: { valid: true, sanitized: "test\\%\\%\\%", error: null }
 */
export function validateSearchQuery(query, options = {}) {
  const { minLength = 2, maxLength = 100 } = options;

  // Check if query exists
  if (!query || typeof query !== 'string') {
    return {
      valid: false,
      sanitized: null,
      error: 'Query is required'
    };
  }

  // Trim
  const trimmed = query.trim();

  // Check minimum length
  if (trimmed.length < minLength) {
    return {
      valid: false,
      sanitized: null,
      error: `Query must be at least ${minLength} characters`
    };
  }

  // Check maximum length (before escaping)
  if (trimmed.length > maxLength) {
    return {
      valid: false,
      sanitized: null,
      error: `Query too long (max ${maxLength} characters)`
    };
  }

  // Sanitize
  const sanitized = sanitizeILIKE(trimmed, maxLength);

  return {
    valid: true,
    sanitized,
    error: null
  };
}

/**
 * Safe ILIKE pattern builder
 *
 * Creates a properly escaped ILIKE pattern with wildcards
 *
 * @param {string} input - User input
 * @param {string} position - Where to add wildcards: 'both', 'start', 'end', 'none'
 * @returns {string} Safe ILIKE pattern
 *
 * @example
 * buildILIKEPattern("test", "both")   // Returns: "%test%"
 * buildILIKEPattern("test%", "both")  // Returns: "%test\\%%"
 * buildILIKEPattern("test", "start")  // Returns: "%test"
 * buildILIKEPattern("test", "end")    // Returns: "test%"
 * buildILIKEPattern("test", "none")   // Returns: "test"
 */
export function buildILIKEPattern(input, position = 'both') {
  const sanitized = sanitizeILIKE(input);

  if (!sanitized) {
    return null;
  }

  switch (position) {
    case 'both':
      return `%${sanitized}%`;
    case 'start':
      return `%${sanitized}`;
    case 'end':
      return `${sanitized}%`;
    case 'none':
      return sanitized;
    default:
      return `%${sanitized}%`;
  }
}

/**
 * Example: Detect potential injection attempts
 *
 * Returns true if input contains suspicious patterns that might indicate
 * an injection attempt (even after sanitization)
 *
 * @param {string} input - User input
 * @returns {boolean} True if suspicious
 */
export function detectSuspiciousPattern(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /(%){5,}/,           // Multiple percent signs (%%%%)
    /(_){10,}/,          // Many underscores
    /(%_){5,}/,          // Alternating % and _
    /(\\){5,}/,          // Multiple backslashes
    /[\x00-\x08\x0B\x0C\x0E-\x1F]/, // Control characters
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

// =============================================================================
// TESTS (for documentation - run in Node.js REPL if needed)
// =============================================================================

/**
 * Test cases for sanitizeILIKE
 *
 * Run these in Node.js to verify:
 *
 * console.log(sanitizeILIKE("normal query")); // "normal query"
 * console.log(sanitizeILIKE("test%"));        // "test\\%"
 * console.log(sanitizeILIKE("___"));          // "\\_\\_\\_"
 * console.log(sanitizeILIKE("test\\"));       // "test\\\\"
 * console.log(sanitizeILIKE("%%%"));          // "\\%\\%\\%"
 * console.log(sanitizeILIKE("a".repeat(200), 50)); // Truncated to 50 chars
 * console.log(sanitizeILIKE(""));             // null
 * console.log(sanitizeILIKE(null));           // null
 *
 * // Real attack examples:
 * console.log(sanitizeILIKE("%25%25%25"));    // Escapes all % signs
 * console.log(sanitizeILIKE("test_wallet"));  // Escapes underscore
 */
